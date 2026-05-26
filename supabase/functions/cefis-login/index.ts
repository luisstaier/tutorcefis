import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, pass } = await req.json();

    if (!email || !pass) {
      return new Response(
        JSON.stringify({ error: "Preencha email e senha" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://cefis.com.br/api/v1/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ email, pass }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Email ou senha incorretos" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: data.message || "Erro ao fazer login na CEFIS" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = data.user || {};
    return new Response(
      JSON.stringify({
        key: data.key,
        userName: user.name,
        userEmail: user.email,
        occupation: user.occupation,
        nivel: user.nivel,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Login error:", error);
    return new Response(
      JSON.stringify({ error: "Ocorreu um erro inesperado ao conectar com a CEFIS." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
