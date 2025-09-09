import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationEmailRequest {
  user_id: string;
  ticket_id: string;
  type: 'ticket_assigned' | 'ticket_created' | 'ticket_updated';
  title: string;
  message: string;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      console.error('Resend API key not configured. Please set RESEND_API_KEY in Supabase secrets');
      return new Response(
        JSON.stringify({ message: 'Email service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, ticket_id, type, title, message }: NotificationEmailRequest = await req.json();

    // Get user email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, display_name')
      .eq('id', user_id)
      .single();

    if (userError || !userData) {
      console.error('User not found:', userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Get ticket details
    const { data: ticketData, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        *,
        hotels!tickets_hotel_id_fkey (name)
      `)
      .eq('id', ticket_id)
      .single();

    if (ticketError || !ticketData) {
      console.error('Ticket not found:', ticketError);
      return new Response(
        JSON.stringify({ error: 'Ticket not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Prepare email content based on notification type
    let emailSubject = '';
    let emailHtml = '';

    if (type === 'ticket_assigned') {
      emailSubject = '🔧 Chamado atribuído a você';
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Novo Chamado Atribuído</h2>
          <p>Olá ${userData.display_name || userData.email},</p>
          <p>Você foi atribuído ao seguinte chamado:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #1f2937;">${ticketData.title}</h3>
            <p style="margin: 5px 0;"><strong>Hotel:</strong> ${ticketData.hotels?.name || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Quarto:</strong> ${ticketData.room_number || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Categoria:</strong> ${ticketData.category || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Prioridade:</strong> ${ticketData.priority}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> ${ticketData.status}</p>
            ${ticketData.description ? `<p style="margin: 10px 0 5px 0;"><strong>Descrição:</strong></p><p style="margin: 5px 0;">${ticketData.description}</p>` : ''}
          </div>
          <p>Acesse o sistema para mais detalhes e atualizações do chamado.</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Esta é uma mensagem automática. Por favor, não responda a este e-mail.</p>
        </div>
      `;
    } else if (type === 'ticket_created') {
      emailSubject = '📋 Novo chamado aberto';
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Novo Chamado Aberto</h2>
          <p>Olá ${userData.display_name || userData.email},</p>
          <p>Um novo chamado foi aberto no hotel que você está vinculado:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #1f2937;">${ticketData.title}</h3>
            <p style="margin: 5px 0;"><strong>Hotel:</strong> ${ticketData.hotels?.name || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Quarto:</strong> ${ticketData.room_number || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Categoria:</strong> ${ticketData.category || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Prioridade:</strong> ${ticketData.priority}</p>
            ${ticketData.description ? `<p style=\"margin: 10px 0 5px 0;\"><strong>Descrição:</strong></p><p style=\"margin: 5px 0;\">${ticketData.description}</p>` : ''}
          </div>
          <p>Acesse o sistema para visualizar e atender este chamado.</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Esta é uma mensagem automática. Por favor, não responda a este e-mail.</p>
        </div>
      `;
    } else if (type === 'ticket_updated') {
      emailSubject = '📢 Chamado atualizado';
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Chamado Atualizado</h2>
          <p>Olá ${userData.display_name || userData.email},</p>
          <p>${message}</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #1f2937;">${ticketData.title}</h3>
            <p style="margin: 5px 0;"><strong>Hotel:</strong> ${ticketData.hotels?.name || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Quarto:</strong> ${ticketData.room_number || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Status atual:</strong> ${ticketData.status}</p>
          </div>
          <p>Acesse o sistema para mais detalhes.</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Esta é uma mensagem automática. Por favor, não responda a este e-mail.</p>
        </div>
      `;
    }

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "MAJ TECH <onboarding@resend.dev>",
      to: userData.email,
      subject: emailSubject,
      html: emailHtml,
    });

    console.log("Email sent successfully via Resend to:", userData.email, emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error in send-notification-email (SMTP) function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
