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
    let type = url.searchParams.get("type");
    let search = url.searchParams.get("search") || "";
    let id = url.searchParams.get("id") || "";
    let count = url.searchParams.get("count") || "10";
    let page = url.searchParams.get("page") || "1";

    // Handle POST request body
    if (req.method === "POST") {
      try {
        const body = await req.json();
        type = body.type || type;
        search = body.search || search;
        id = body.id || id;
        count = body.count || count;
        page = body.page || page;
      } catch (e) {
        console.log("No JSON body found or invalid JSON");
      }
    }


    const { userKey } = await (async () => {
      try {
        const cloned = req.clone();
        return await cloned.json();
      } catch {
        return {};
      }
    })();

    const cefisApiKey = userKey || Deno.env.get("CEFIS_API_KEY");

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

    if (type === "user") {
      const apiUrl = "https://cefis.com.br/api/v1/user/me";
      console.log(`Fetching user data from CEFIS API: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Authorization": cefisApiKey,
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`CEFIS User API Error: ${response.status} - ${errorText}`);
        return new Response(
          JSON.stringify({ error: "Erro ao buscar dados do usuário na CEFIS.", details: errorText }),
          {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const result = await response.json();
      const nivelMap: Record<number, string> = {
        1: "iniciante",
        2: "intermediário",
        3: "avançado"
      };

      return new Response(
        JSON.stringify({
          name: result.name || "",
          occupation: result.occupation || "",
          nivel: nivelMap[result.nivel] || "",
          activities: result.activities || []
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let apiUrl;
    if (id) {
      apiUrl = new URL(`https://api-v3.cefis.com.br/courses/${id}`);
    } else {
      apiUrl = new URL("https://api-v3.cefis.com.br/courses");
      apiUrl.searchParams.set("count", count);
      apiUrl.searchParams.set("page", page);
      if (search) {
        apiUrl.searchParams.set("search", search);
      }
    }

    console.log(`Fetching courses from CEFIS API: ${apiUrl.toString()}`);

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
    const courses = id ? [result.data || result] : (result.data || []);
    const transformedData = courses.map((course: any) => ({
      id: course.id,
      title: course.title,
      subtitle: course.subtitle,
      summary: course.summary,
      keywords: course.keywords,
      duration: course.duration,
      lessonCount: course.lessonCount,
      averageRating: course.averageRating,
      categories: course.categories,
      banner: course.banner,
      teacher: course.teacher,
      goals: course.goals,
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
