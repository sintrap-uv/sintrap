import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Verificar que quien llama es un administrador ──────────
    // El cliente público envía su JWT en el header Authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No autorizado: falta token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cliente con el JWT del usuario que hace la llamada (para verificar su rol)
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Obtener sesión del llamante y buscar su perfil
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido o sesión expirada" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: perfil, error: perfilError } = await supabaseUser
      .from("profiles")
      .select("rol")
      .eq("id", user.id)
      .single();

    if (perfilError || perfil?.rol !== "administrador") {
      return new Response(
        JSON.stringify({ error: "Acceso denegado: solo administradores pueden crear conductores" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Leer y validar el body ─────────────────────────────────
    const { nombre, cedula, celular, email, password } = await req.json();

    if (!nombre || !cedula || !celular || !email || !password) {
      return new Response(
        JSON.stringify({ error: "Faltan campos requeridos: nombre, cedula, celular, email, password" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "La contraseña debe tener mínimo 6 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Crear usuario con service_role (no cambia sesión del admin) ──
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!  // clave secreta, solo en el servidor
    );

    const { data: nuevoUsuario, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,  // confirmar email automáticamente
      user_metadata: {
        // El trigger handle_new_user lee estos campos para crear el profile
        nombre: nombre.trim(),
        cedula: cedula.trim(),
        celular: celular.trim(),
        rol: "conductor",
      },
    });

    if (createError) {
      // Mensaje amigable para email duplicado
      const mensaje = createError.message.includes("already registered")
        ? "Ya existe un usuario con ese email"
        : createError.message;

      return new Response(
        JSON.stringify({ error: mensaje }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 4. Respuesta exitosa ──────────────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        conductor: {
          id: nuevoUsuario.user.id,
          email: nuevoUsuario.user.email,
          nombre: nombre.trim(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Error interno del servidor: " + e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
