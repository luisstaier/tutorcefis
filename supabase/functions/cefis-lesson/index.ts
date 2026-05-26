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
    const { courseId } = await req.json();
    const cefisApiKey = Deno.env.get("CEFIS_API_KEY");

    if (!cefisApiKey) throw new Error("API Key ausente");

    // Busca as aulas do curso
    const response = await fetch(`https://api-v3.cefis.com.br/courses/${courseId}/lessons`, {
      headers: {
        "Authorization": `Bearer ${cefisApiKey}`,
        "Accept": "application/json",
      }
    });

    const lessonsResult = await response.json();
    // A API pode retornar { data: [...] } ou direto [...]
    const lessons = Array.isArray(lessonsResult) ? lessonsResult : (lessonsResult.data || []);
    
    // Retorna a primeira aula que tiver stream_sources
    const firstLesson = lessons.find((l: any) => l.stream_sources && l.stream_sources.length > 0) || lessons[0];

    return new Response(JSON.stringify(firstLesson || null), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in cefis-lesson:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
