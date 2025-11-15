import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getDefaultPassword(): string {
  return 'welcomeparis2026';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if user exists
    const { data: users, error: userError } = await supabaseAdmin
      .from('users')
      .select('display_name')
      .eq('email', email)
      .single();

    if (userError || !users) {
      console.log('User not found:', email);
      // Don't reveal if user exists or not for security
      return new Response(
        JSON.stringify({ success: true, message: 'Si un compte existe avec cet email, un mot de passe temporaire a été envoyé.' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use default password
    const tempPassword = getDefaultPassword();

    // Update user password in auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      (await supabaseAdmin.auth.admin.listUsers()).data.users.find(u => u.email === email)?.id ?? '',
      { password: tempPassword }
    );

    if (authError) {
      console.error('Error updating password:', authError);
      throw authError;
    }

    // Send email with temporary password
    const emailResponse = await resend.emails.send({
      from: "MAJ Desk <onboarding@resend.dev>",
      to: [email],
      subject: "🔐 Votre mot de passe temporaire - MAJ Desk",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Mot de passe temporaire - MAJ TECH</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #1e293b, #334155); padding: 40px 20px; text-align: center; }
            .logo { margin: 0 auto 20px; }
            .logo img { width: 120px; height: auto; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 700; }
            .header p { color: #cbd5e1; margin: 10px 0 0; font-size: 16px; }
            .content { padding: 40px 30px; }
            .greeting { font-size: 18px; color: #334155; margin-bottom: 25px; }
            .password-box { background: linear-gradient(135deg, #f1f5f9, #e2e8f0); border-radius: 12px; padding: 25px; margin: 25px 0; border: 2px solid #3b82f6; text-align: center; }
            .password-label { font-size: 14px; color: #64748b; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
            .password-value { font-size: 28px; font-weight: 700; color: #1e293b; font-family: 'Courier New', monospace; letter-spacing: 2px; margin: 15px 0; background: white; padding: 15px; border-radius: 8px; border: 1px dashed #cbd5e1; }
            .warning-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin: 25px 0; }
            .warning-text { color: #dc2626; font-size: 14px; margin: 0; }
            .instructions { background: #f0f9ff; border-radius: 8px; padding: 20px; margin: 25px 0; }
            .instructions-title { font-weight: 600; color: #1e293b; margin-bottom: 15px; }
            .instructions-list { margin: 0; padding-left: 20px; color: #475569; }
            .instructions-list li { margin: 8px 0; }
            .footer { background: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
            .footer-text { color: #64748b; font-size: 14px; margin: 0; }
            .company-info { margin-top: 15px; color: #94a3b8; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">
                <img src="https://vesffhlaeycsulblwxsa.supabase.co/storage/v1/object/public/maj-desk-logo.jpg" alt="MAJ Desk Logo" />
              </div>
              <h1>MAJ Desk</h1>
              <p>Système de Gestion de Maintenance</p>
            </div>
            
            <div class="content">
              <div class="greeting">
                Bonjour <strong>${users.display_name || 'Utilisateur'}</strong>,
              </div>
              
              <p>Vous avez demandé la réinitialisation de votre mot de passe. Voici votre mot de passe temporaire :</p>
              
              <div class="password-box">
                <div class="password-label">Mot de passe temporaire</div>
                <div class="password-value">${tempPassword}</div>
              </div>
              
              <div class="warning-box">
                <p class="warning-text">
                  ⚠️ <strong>Important :</strong> Ce mot de passe est temporaire. Pour des raisons de sécurité, nous vous recommandons de le changer dès votre première connexion.
                </p>
              </div>
              
              <div class="instructions">
                <div class="instructions-title">Comment utiliser ce mot de passe :</div>
                <ol class="instructions-list">
                  <li>Rendez-vous sur la page de connexion de MAJ Desk</li>
                  <li>Entrez votre adresse email : <strong>${email}</strong></li>
                  <li>Utilisez le mot de passe temporaire ci-dessus</li>
                  <li>Une fois connecté, accédez aux paramètres pour changer votre mot de passe</li>
                </ol>
              </div>
              
              <p style="color: #64748b; font-size: 14px; margin-top: 25px;">
                Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email et contacter l'administrateur système.
              </p>
            </div>
            
            <div class="footer">
              <p class="footer-text">
                Cet email a été envoyé automatiquement par le système MAJ Desk.
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

    console.log("Temporary password email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Si un compte existe avec cet email, un mot de passe temporaire a été envoyé.' 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in reset-password-temporary function:", error);
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