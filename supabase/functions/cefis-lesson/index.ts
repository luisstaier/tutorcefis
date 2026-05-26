import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchLessonDetail(lessonId: number, apiKey: string) {
  try {
    const r = await fetch(`https://api-v3.cefis.com.br/lessons/${lessonId}`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
      }
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.data || j;
  } catch (e) {
    console.error(`Erro detalhe aula ${lessonId}:`, e);
    return null;
  }
}

function extractVideoUrl(lesson: any): string | null {
  const sources = lesson?.stream_sources || [];
  return sources.find((s: any) => s.quality === "sd")?.link_secure
      || sources.find((s: any) => s.quality === "hd")?.link_secure
      || sources[0]?.link_secure
      || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { courseId, lessonId, userKey } = body;
    const validUserKey = userKey && userKey !== "undefined" && userKey !== "null" ? userKey : null;
    const cefisApiKey = validUserKey || Deno.env.get("CEFIS_API_KEY");

    if (!cefisApiKey) throw new Error("API Key ausente");

    // 1. Lista de aulas do curso
    const listResponse = await fetch(`https://api-v3.cefis.com.br/courses/${courseId}/lessons`, {
      headers: {
        "Authorization": `Bearer ${cefisApiKey}`,
        "Accept": "application/json",
      }
    });

    const lessonsResult = await listResponse.json();
    const lessons = Array.isArray(lessonsResult) ? lessonsResult : (lessonsResult.data || []);

    console.log(`Curso ${courseId}: ${lessons.length} aulas. Primeira aula tem stream_sources?`, !!lessons[0]?.stream_sources);

    // 2. Buscar detalhes (stream_sources) de cada aula em paralelo
    const detailedLessons = await Promise.all(
      lessons.map(async (l: any) => {
        let full = l;
        if (!l.stream_sources || l.stream_sources.length === 0) {
          const detail = await fetchLessonDetail(l.id, cefisApiKey);
          if (detail) full = { ...l, ...detail };
        }
        return full;
      })
    );

    // 3. Galeria com videoUrl
    const gallery = detailedLessons.map((l: any, idx: number) => ({
      id: l.id,
      title: l.title || `Aula ${idx + 1}`,
      duration: l.duration || null,
      order: l.order ?? idx,
      thumbnail: l.thumbnail || l.poster || l.banner || l.cover_url || l.image || null,
      videoUrl: extractVideoUrl(l),
      hasVideo: !!extractVideoUrl(l),
    }));

    const withVideo = gallery.filter((l: any) => l.videoUrl).length;
    console.log(`Aulas com vídeo: ${withVideo}/${gallery.length}`);

    // 4. Determina current
    let current = null;
    if (lessonId) {
      current = gallery.find((l: any) => l.id === Number(lessonId)) || gallery[0];
    } else {
      current = gallery.find((l: any) => l.videoUrl) || gallery[0];
    }

    return new Response(JSON.stringify({
      current,
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
