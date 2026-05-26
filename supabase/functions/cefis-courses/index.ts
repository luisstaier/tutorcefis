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
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const count = url.searchParams.get("count") || "10";
    const page = url.searchParams.get("page") || "1";

    const cefisApiKey = Deno.env.get("CEFIS_API_KEY");

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

    const apiUrl = new URL("https://api-v3.cefis.com.br/courses");
    apiUrl.searchParams.set("count", count);
    apiUrl.searchParams.set("page", page);
    if (search) {
      apiUrl.searchParams.set("search", search);
    }

    console.log(`Fetching from CEFIS API: ${apiUrl.toString()}`);

    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${cefisApiKey}`,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`CEFIS API Error: ${response.status} - ${errorText}`);
      
      let message = "Erro ao buscar cursos da CEFIS.";
      if (response.status === 401 || response.status === 403) {
        message = "Não autorizado. Verifique a chave da API CEFIS.";
      } else if (response.status >= 500) {
        message = "A API da CEFIS está enfrentando instabilidades temporárias.";
      }

      return new Response(
        JSON.stringify({ error: message, details: errorText }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = await response.json();
    
    // Transform data according to requirements
    const transformedData = (result.data || []).map((course: any) => ({
      id: course.id,
      title: course.title,
      subtitle: course.subtitle,
      summary: course.summary,
      keywords: course.keywords,
      duration: course.duration,
      lessonCount: course.lessonCount,
      averageRating: course.averageRating,
      categories: course.categories,
    }));

    return new Response(
      JSON.stringify({
        data: transformedData,
        total: result.total,
        page: result.page,
        pages: result.pages,
      }),
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
