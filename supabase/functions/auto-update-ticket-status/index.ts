import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting automatic ticket status update...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the time threshold (1 hour ago)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    const oneHourAgoISO = oneHourAgo.toISOString();

    console.log(`Looking for NEW tickets created before: ${oneHourAgoISO}`);

    // Find all tickets with status NEW that were created more than 1 hour ago
    const { data: ticketsToUpdate, error: fetchError } = await supabase
      .from('tickets')
      .select('id, title, created_at')
      .eq('status', 'NEW')
      .lt('created_at', oneHourAgoISO);

    if (fetchError) {
      console.error('Error fetching tickets:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${ticketsToUpdate?.length || 0} tickets to update`);

    if (!ticketsToUpdate || ticketsToUpdate.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No tickets to update',
          updated: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Update all found tickets to IN_PROGRESS status
    const { data: updatedTickets, error: updateError } = await supabase
      .from('tickets')
      .update({ status: 'IN_PROGRESS' })
      .in('id', ticketsToUpdate.map(t => t.id))
      .select();

    if (updateError) {
      console.error('Error updating tickets:', updateError);
      throw updateError;
    }

    console.log(`Successfully updated ${updatedTickets?.length || 0} tickets to IN_PROGRESS`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Updated ${updatedTickets?.length || 0} tickets to IN_PROGRESS`,
        updated: updatedTickets?.length || 0,
        tickets: updatedTickets
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in auto-update-ticket-status:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
