import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client with the user's token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Validate current user via JWT and Supabase Auth
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userErr } = await supabaseClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      throw new Error('Not authenticated');
    }
    const currentUserId = userData.user.id;

    const { data: adminCheck, error: adminErr } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', currentUserId)
      .single();

    if (adminErr) {
      throw adminErr;
    }

    if (!adminCheck || adminCheck.role !== 'ADMIN') {
      throw new Error('Only administrators can reset passwords');
    }

    // Get the user ID and new password from the request
    const { userId, newPassword } = await req.json();

    if (!userId || !newPassword) {
      throw new Error('User ID and new password are required');
    }

    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Create admin client to update password
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Update the user's password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      throw updateError;
    }

    console.log(`Password updated for user ${userId} by admin ${currentUserId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Mot de passe mis à jour avec succès' 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in admin-reset-password function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message.includes('administrator') ? 403 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);