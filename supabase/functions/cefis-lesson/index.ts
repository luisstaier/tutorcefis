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

    // 1. Busca todas as aulas do curso
    const listResponse = await fetch(`https://api-v3.cefis.com.br/courses/${courseId}/lessons`, {
      headers: {
        "Authorization": `Bearer ${cefisApiKey}`,
        "Accept": "application/json",
      }
    });

    const lessonsResult = await listResponse.json();
    const lessons = Array.isArray(lessonsResult) ? lessonsResult : (lessonsResult.data || []);

    // 2. Prepara a galeria com videoUrl incluído para cada aula
    const gallery = lessons.map((l: any, idx: number) => {
      // Tenta encontrar o link seguro de qualidade SD ou o primeiro disponível
      const streamSources = l.stream_sources || [];
      const videoUrl = streamSources.find((s: any) => s.quality === "sd")?.link_secure 
                    || streamSources[0]?.link_secure 
                    || null;

      return {
        id: l.id,
        title: l.title || `Aula ${idx + 1}`,
        duration: l.duration || null,
        order: l.order ?? idx,
        thumbnail: l.thumbnail || l.poster || l.banner || l.cover_url || l.image || null,
        videoUrl: videoUrl,
        hasVideo: !!videoUrl,
        stream_sources: streamSources // Mantém para compatibilidade se necessário
      };
    });

    // 3. Determina qual aula carregar no player (current)
    let currentLesson = null;
    if (lessonId) {
      currentLesson = gallery.find((l: any) => l.id === parseInt(lessonId.toString())) || gallery[0];
    } else {
      currentLesson = gallery.find((l: any) => l.videoUrl) || gallery[0];
    }

    return new Response(JSON.stringify({
      current: currentLesson,
      lessons: gallery,
      total: gallery.length,
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