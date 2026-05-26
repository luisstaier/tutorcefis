import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userKey } = await (async () => {
      try {
        const cloned = req.clone();
        return await cloned.json();
      } catch {
        return {};
      }
    })();

    const validUserKey = userKey && userKey !== "undefined" && userKey !== "null" ? userKey : null;
    const cefisApiKey = validUserKey || Deno.env.get("CEFIS_API_KEY");

    if (!cefisApiKey) {
      console.error("CEFIS_API_KEY not set");
      return new Response(
        JSON.stringify({ error: "Configuração do servidor incompleta (API Key ausente)." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const apiUrl = "https://cefis.com.br/api/v1/user/me";
    console.log(`Fetching from CEFIS API: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Authorization": cefisApiKey,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`CEFIS API Error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar dados do usuário na CEFIS.", details: errorText }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = await response.json();
    
    // The API returns { name, occupation, nivel, activities } as requested
    // Mapping nivel: 1=iniciante, 2=intermediário, 3=avançado
    const nivelMap: Record<number, string> = {
      1: "iniciante",
      2: "intermediário",
      3: "avançado"
    };

    const userData = {
      name: result.name || "",
      occupation: result.occupation || "",
      nivel: nivelMap[result.nivel] || "",
      activities: result.activities || []
    };

    return new Response(
      JSON.stringify(userData),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Ocorreu um erro inesperado no servidor.", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
