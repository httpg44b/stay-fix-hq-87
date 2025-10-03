import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AssignmentEmailRequest {
  technicianEmail: string;
  technicianName: string;
  ticketTitle: string;
  ticketId: string;
  roomNumber: string;
  hotelName: string;
  priority: string;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      console.error('Resend API key not configured. Please set RESEND_API_KEY in Supabase secrets');
      return new Response(
        JSON.stringify({ message: 'Email service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const resend = new Resend(resendApiKey);

    const { 
      technicianEmail, 
      technicianName, 
      ticketTitle, 
      ticketId, 
      roomNumber, 
      hotelName, 
      priority 
    }: AssignmentEmailRequest = await req.json();

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Chamado Atribuído - MAJ TECH</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background: linear-gradient(135deg, #1e293b, #334155); padding: 40px 20px; text-align: center; }
          .logo { width: 80px; height: 80px; margin: 0 auto 20px; background-color: rgba(255,255,255,0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
          .logo-text { color: white; font-size: 24px; font-weight: bold; }
          .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 700; }
          .header p { color: #cbd5e1; margin: 10px 0 0; font-size: 16px; }
          .content { padding: 40px 30px; }
          .greeting { font-size: 18px; color: #334155; margin-bottom: 25px; }
          .ticket-card { background: #f1f5f9; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #3b82f6; }
          .ticket-title { font-size: 20px; font-weight: 600; color: #1e293b; margin-bottom: 15px; }
          .ticket-details { display: grid; gap: 12px; }
          .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
          .detail-label { font-weight: 500; color: #64748b; }
          .detail-value { font-weight: 600; color: #1e293b; }
          .priority-high { background: #fef2f2; color: #dc2626; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; }
          .priority-medium { background: #fef3c7; color: #d97706; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; }
          .priority-low { background: #f0fdf4; color: #16a34a; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 25px 0; }
          .footer { background: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
          .footer-text { color: #64748b; font-size: 14px; margin: 0; }
          .company-info { margin-top: 15px; color: #94a3b8; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">
              <div class="logo-text">MJ</div>
            </div>
            <h1>MAJ TECH</h1>
            <p>Sistema de Gestão Hoteleira</p>
          </div>
          
          <div class="content">
            <div class="greeting">
              Olá <strong>${technicianName}</strong>,
            </div>
            
            <p>Um novo chamado de manutenção foi atribuído a você. Por favor, verifique os detalhes abaixo e tome as ações necessárias.</p>
            
            <div class="ticket-card">
              <div class="ticket-title">🔧 ${ticketTitle}</div>
              <div class="ticket-details">
                <div class="detail-row">
                  <span class="detail-label">🏨 Hotel:</span>
                  <span class="detail-value">${hotelName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">🚪 Quarto/Área:</span>
                  <span class="detail-value">${roomNumber}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">⚡ Prioridade:</span>
                  <span class="priority-${priority.toLowerCase()}">${priority === 'HIGH' ? 'ALTA' : priority === 'MEDIUM' ? 'Moyenne' : 'BAIXA'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">📋 ID do Chamado:</span>
                  <span class="detail-value">#${ticketId.slice(-8)}</span>
                </div>
              </div>
            </div>
            
            <p style="margin: 25px 0;">
              <strong>Próximos passos:</strong><br>
              1. Acesse o sistema MAJ TECH<br>
              2. Visualize os detalhes completos do chamado<br>
              3. Inicie o atendimento e registre o progresso<br>
              4. Finalize com a solução aplicada
            </p>
            
            <div style="text-align: center;">
              <a href="#" class="cta-button">
                🔗 Acessar Sistema MAJ TECH
              </a>
            </div>
            
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin: 25px 0;">
              <p style="margin: 0; color: #1e40af; font-size: 14px;">
                💡 <strong>Dica:</strong> Mantenha o hóspede informado sobre o progresso e tempo estimado para conclusão do atendimento.
              </p>
            </div>
          </div>
          
          <div class="footer">
            <p class="footer-text">
              Este é um email automático do sistema MAJ TECH.
            </p>
            <div class="company-info">
              MAJ TECH - Système de Gestion de Maintenance Hoteleira<br>
              Tecnologia para Hotelaria Eficiente
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "MAJ TECH <onboarding@resend.dev>",
      to: technicianEmail,
      subject: `🔧 Novo chamado atribuído - ${ticketTitle}`,
      html: emailHtml,
    });

    console.log("Assignment email sent successfully via Resend:", technicianEmail, emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-assignment-email (SMTP) function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
