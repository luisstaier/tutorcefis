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

    // 1. Busca todas as aulas para a galeria
    const listResponse = await fetch(`https://api-v3.cefis.com.br/courses/${courseId}/lessons`, {
      headers: {
        "Authorization": `Bearer ${cefisApiKey}`,
        "Accept": "application/json",
      }
    });

    const lessonsResult = await listResponse.json();
    const lessons = Array.isArray(lessonsResult) ? lessonsResult : (lessonsResult.data || []);

    // 2. Determina qual aula carregar no player
    let selectedLesson = null;
    
    if (lessonId) {
      // Se tiver lessonId, buscamos os detalhes específicos (para garantir stream_sources)
      console.log(`Buscando detalhes da aula específica: ${lessonId}`);
      const detailResponse = await fetch(`https://api-v3.cefis.com.br/lessons/${lessonId}`, {
        headers: {
          "Authorization": `Bearer ${cefisApiKey}`,
          "Accept": "application/json",
        }
      });
      if (detailResponse.ok) {
        selectedLesson = await detailResponse.json();
        if (selectedLesson.data) selectedLesson = selectedLesson.data;
      }
    }

    // Fallback se não encontrou por ID ou se não foi passado ID
    if (!selectedLesson || !selectedLesson.stream_sources || selectedLesson.stream_sources.length === 0) {
      selectedLesson = lessons.find((l: any) => l.stream_sources && l.stream_sources.length > 0) || lessons[0] || null;
      
      // Se o selecionado do fallback ainda não tem stream_sources e temos um ID, tenta buscar detalhes dele
      if (selectedLesson && (!selectedLesson.stream_sources || selectedLesson.stream_sources.length === 0)) {
         const detailResponse = await fetch(`https://api-v3.cefis.com.br/lessons/${selectedLesson.id}`, {
          headers: {
            "Authorization": `Bearer ${cefisApiKey}`,
            "Accept": "application/json",
          }
        });
        if (detailResponse.ok) {
          const detailData = await detailResponse.json();
          selectedLesson = detailData.data || detailData;
        }
      }
    }

    // Lista enxuta para galeria
    const gallery = lessons.map((l: any, idx: number) => ({
      id: l.id,
      title: l.title || `Aula ${idx + 1}`,
      duration: l.duration || null,
      order: l.order ?? idx,
      thumbnail: l.thumbnail || l.poster || l.banner || l.cover_url || l.image || null,
      hasVideo: !!(l.stream_sources && l.stream_sources.length > 0),
    }));

    return new Response(JSON.stringify({
      current: selectedLesson,
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