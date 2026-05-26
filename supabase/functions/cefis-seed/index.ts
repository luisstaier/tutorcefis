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
    const { userKey } = body;
    const cefisApiKey = userKey || Deno.env.get("CEFIS_API_KEY");

    if (!cefisApiKey) {
      throw new Error("CEFIS_API_KEY não configurada.");
    }

    let page = 1;
    let totalIndexed = 0;
    let totalCourses = 0;

    while (true) {
      const cefisUrl = `https://api-v3.cefis.com.br/courses?count=50&page=${page}`;
      const response = await fetch(cefisUrl, {
        headers: {
          "Authorization": `Bearer ${cefisApiKey}`,
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Erro na API CEFIS ao buscar página ${page}: ${response.status}`);
      }

      const result = await response.json();
      const courses = result.data || [];
      const totalPages = result.pages || 1;

      if (courses.length === 0) break;

      const upsertData = courses.map((c: any) => ({
        course_id: c.id,
        title: c.title,
        subtitle: c.subtitle,
        summary: c.summary,
        keywords: c.keywords,
        goals: c.goals,
        duration: c.duration,
        lesson_count: c.lessonCount,
        average_rating: c.averageRating,
        categories: Array.isArray(c.categories) ? c.categories.join(', ') : c.categories,
        teacher_name: c.teacher?.name,
      }));

      const { error: upsertError } = await supabaseClient
        .from("cefis_catalog")
        .upsert(upsertData, { onConflict: "course_id" });

      if (upsertError) {
        console.error(`Erro no upsert da página ${page}:`, upsertError);
        throw upsertError;
      }

      totalIndexed += courses.length;
      totalCourses = result.total || totalIndexed;

      if (page >= totalPages) break;
      page++;
    }

    return new Response(JSON.stringify({ total: totalCourses, indexados: totalIndexed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro na função cefis-seed:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});