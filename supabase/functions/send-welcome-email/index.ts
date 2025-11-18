import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  user_id: string;
  email: string;
  display_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, display_name }: WelcomeEmailRequest = await req.json();

    console.log(`Sending welcome email to ${email} (${display_name})`);

    const emailResponse = await resend.emails.send({
      from: "MAJ Desk <onboarding@resend.dev>",
      to: [email],
      subject: "🎉 Bienvenue sur MAJ Desk - Votre compte est activé!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bienvenue - MAJ Desk</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #1e293b, #334155); padding: 40px 20px; text-align: center; }
            .logo { margin: 0 auto 20px; }
            .logo img { width: 120px; height: auto; }
            .header h1 { color: white; margin: 0; font-size: 32px; font-weight: 700; }
            .header p { color: #cbd5e1; margin: 10px 0 0; font-size: 16px; }
            .content { padding: 40px 30px; }
            .welcome-badge { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 12px 24px; border-radius: 50px; display: inline-block; font-weight: 600; margin-bottom: 25px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
            .greeting { font-size: 24px; color: #1e293b; margin-bottom: 20px; font-weight: 600; }
            .message { font-size: 16px; color: #475569; line-height: 1.6; margin-bottom: 25px; }
            .success-box { background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px; padding: 25px; margin: 30px 0; text-align: center; color: white; }
            .success-box-icon { font-size: 48px; margin-bottom: 15px; }
            .success-box-title { font-size: 20px; font-weight: 700; margin-bottom: 10px; }
            .success-box-text { font-size: 16px; opacity: 0.95; }
            .features { background: #f8fafc; border-radius: 12px; padding: 25px; margin: 30px 0; }
            .features-title { font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 20px; text-align: center; }
            .feature-item { display: flex; align-items: start; margin-bottom: 15px; }
            .feature-icon { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 15px; flex-shrink: 0; font-weight: 700; }
            .feature-text { color: #475569; font-size: 15px; line-height: 1.5; flex: 1; padding-top: 4px; }
            .cta-box { background: linear-gradient(135deg, #f1f5f9, #e2e8f0); border-radius: 12px; padding: 25px; margin: 30px 0; text-align: center; }
            .cta-title { font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 15px; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin-top: 10px; }
            .footer { background: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
            .footer-text { color: #64748b; font-size: 14px; margin: 0; line-height: 1.6; }
            .company-info { margin-top: 15px; color: #94a3b8; font-size: 12px; }
            .divider { height: 1px; background: linear-gradient(90deg, transparent, #e2e8f0, transparent); margin: 30px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">
                <img src="https://vesffhlaeycsulblwxsa.supabase.co/storage/v1/object/public/email-assets/maj-tech-logo.jpg" alt="MAJ Desk Logo" />
              </div>
              <h1>MAJ Desk</h1>
              <p>Système de Gestion de Maintenance</p>
            </div>
            
            <div class="content">
              <div style="text-align: center;">
                <span class="welcome-badge">🎉 Compte Activé</span>
              </div>
              
              <div class="greeting">
                Bienvenue, <strong>${display_name}</strong>!
              </div>
              
              <p class="message">
                Nous sommes ravis de vous accueillir sur <strong>MAJ Desk</strong>, votre nouvelle plateforme de gestion de maintenance pour l'hôtellerie.
              </p>
              
              <div class="success-box">
                <div class="success-box-icon">✓</div>
                <div class="success-box-title">Votre licence est maintenant active!</div>
                <div class="success-box-text">Vous avez désormais accès à toutes les fonctionnalités de MAJ Desk</div>
              </div>
              
              <div class="features">
                <div class="features-title">Ce que vous pouvez faire avec MAJ Desk:</div>
                <div class="feature-item">
                  <div class="feature-icon">1</div>
                  <div class="feature-text"><strong>Créer et gérer des tickets</strong> de maintenance pour vos hôtels en temps réel</div>
                </div>
                <div class="feature-item">
                  <div class="feature-icon">2</div>
                  <div class="feature-text"><strong>Assigner des techniciens</strong> et suivre l'avancement des interventions</div>
                </div>
                <div class="feature-item">
                  <div class="feature-icon">3</div>
                  <div class="feature-text"><strong>Gérer vos checklists</strong> et optimiser vos processus de maintenance</div>
                </div>
                <div class="feature-item">
                  <div class="feature-icon">4</div>
                  <div class="feature-text"><strong>Recevoir des notifications</strong> instantanées sur l'état de vos demandes</div>
                </div>
              </div>
              
              <div class="cta-box">
                <div class="cta-title">Prêt à commencer?</div>
                <p style="color: #64748b; font-size: 14px; margin: 10px 0;">
                  Connectez-vous dès maintenant avec votre adresse email et votre mot de passe temporaire
                </p>
                <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || '#'}" class="cta-button">
                  Accéder à MAJ Desk →
                </a>
              </div>
              
              <div class="divider"></div>
              
              <p style="color: #64748b; font-size: 14px; text-align: center; margin: 0;">
                Si vous avez des questions ou besoin d'aide, n'hésitez pas à contacter notre équipe de support.
              </p>
            </div>
            
            <div class="footer">
              <p class="footer-text">
                Cet email a été envoyé automatiquement par le système MAJ Desk.<br>
                Vous recevez cet email car un compte a été créé avec cette adresse.
              </p>
              <div class="company-info">
                MAJ Desk - Système de Gestion de Maintenance<br>
                Technologie pour l'Hôtellerie Efficace
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Welcome email sent successfully' 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
