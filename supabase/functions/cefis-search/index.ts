import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { query, limit = 5 } = body;

    if (!query) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Tentar Busca Full-Text
    const { data: ftsData, error: ftsError } = await supabaseClient
      .from("cefis_catalog")
      .select("*")
      .textSearch("fts", query, {
        config: "portuguese",
        type: "plain",
      })
      .limit(limit);

    if (!ftsError && ftsData && ftsData.length > 0) {
      return new Response(JSON.stringify(ftsData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fallback: ILIKE (Simples)
    const { data: likeData, error: likeError } = await supabaseClient
      .from("cefis_catalog")
      .select("*")
      .or(`title.ilike.%${query}%,summary.ilike.%${query}%`)
      .limit(limit);

    if (likeError) throw likeError;

    return new Response(JSON.stringify(likeData || []), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro na função cefis-search:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});