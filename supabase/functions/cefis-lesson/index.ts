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
    const { courseId, lessonId } = await req.json();
    const cefisApiKey = Deno.env.get("CEFIS_API_KEY");

    if (!cefisApiKey) throw new Error("API Key ausente");

    const response = await fetch(`https://api-v3.cefis.com.br/courses/${courseId}/lessons`, {
      headers: {
        "Authorization": `Bearer ${cefisApiKey}`,
        "Accept": "application/json",
      }
    });

    const lessonsResult = await response.json();
    const lessons = Array.isArray(lessonsResult) ? lessonsResult : (lessonsResult.data || []);

    // Se lessonId vier, retorna aquela aula específica
    const selected = lessonId
      ? lessons.find((l: any) => String(l.id) === String(lessonId))
      : (lessons.find((l: any) => l.stream_sources && l.stream_sources.length > 0) || lessons[0] || null);

    // Lista enxuta para galeria (sem expor links secure de todas)
    const gallery = lessons.map((l: any, idx: number) => ({
      id: l.id,
      title: l.title || `Aula ${idx + 1}`,
      duration: l.duration || null,
      order: l.order ?? idx,
      thumbnail: l.thumbnail || l.poster || l.banner || l.cover_url || l.image || null,
      hasVideo: !!(l.stream_sources && l.stream_sources.length > 0),
    }));

    return new Response(JSON.stringify({
      current: selected,
      lessons: gallery,
      total: lessons.length,
    }), {
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
