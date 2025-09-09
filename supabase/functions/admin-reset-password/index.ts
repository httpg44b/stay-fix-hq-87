import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// CORS headers for browser calls
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError(401, "Não autenticado: cabeçalho Authorization ausente");
    }

    // Supabase client using the caller's JWT to check role in public.users
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Validate current user via Auth
    const jwt = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return jsonError(401, "Não autenticado: token inválido ou expirado");
    }

    const currentUserId = userData.user.id;

    // Ensure caller is ADMIN in our users table
    const { data: roleRow, error: roleErr } = await supabase
      .from("users")
      .select("role")
      .eq("id", currentUserId)
      .single();

    if (roleErr) {
      console.error("Erro ao verificar papel do usuário:", roleErr);
      return jsonError(500, "Falha ao verificar permissões do usuário atual");
    }

    if (!roleRow || roleRow.role !== "ADMIN") {
      return jsonError(403, "Apenas administradores podem alterar senhas");
    }

    // Parse request body
    let body: { userId?: string; newPassword?: string };
    try {
      body = await req.json();
    } catch {
      return jsonError(400, "JSON inválido no corpo da requisição");
    }

    const userId = (body.userId || "").trim();
    const newPassword = (body.newPassword || "").trim();

    if (!userId || !newPassword) {
      return jsonError(400, "'userId' e 'newPassword' são obrigatórios");
    }

    if (newPassword.length < 6) {
      return jsonError(400, "A senha deve ter pelo menos 6 caracteres");
    }

    // Admin client (service role) to update password in Auth
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // First, verify the target user exists in Auth to provide clearer errors
    const { data: authUser, error: getErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (getErr) {
      // If GoTrue returns 404, map to a clear message
      const code = (getErr as any)?.status ?? 500;
      if (code === 404) {
        console.error("Auth user not found:", { userId, getErr });
        return jsonError(404, `Usuário de autenticação não encontrado para o id: ${userId}. Verifique se o usuário foi criado no Auth.`);
      }
      console.error("Erro ao buscar usuário no Auth:", getErr);
      return jsonError(500, "Falha ao localizar o usuário de autenticação");
    }

    // Update password
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (updateErr) {
      const code = (updateErr as any)?.status ?? 500;
      console.error("Erro ao atualizar senha no Auth:", { userId, code, updateErr });
      if (code === 404) {
        return jsonError(404, `Usuário de autenticação não encontrado para o id: ${userId}.`);
      }
      return jsonError(500, "Falha ao atualizar a senha do usuário");
    }

    console.log(`Senha atualizada para usuário ${userId} por admin ${currentUserId}`);

    return new Response(
      JSON.stringify({ success: true, message: "Senha atualizada com sucesso" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Erro inesperado na função admin-reset-password:", err);
    return jsonError(500, "Erro interno do servidor");
  }
});

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
