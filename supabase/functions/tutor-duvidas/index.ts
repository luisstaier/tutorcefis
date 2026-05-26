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
    const { pergunta, perfil } = await req.json();
    
    const cefisApiKey = Deno.env.get("CEFIS_API_KEY");
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!cefisApiKey || !anthropicApiKey) {
      throw new Error("Configuração do servidor incompleta (API Keys ausentes).");
    }

    // 1. Busca conteúdo real da CEFIS relacionado à pergunta
    let cefisUrl = new URL("https://api-v3.cefis.com.br/courses");
    cefisUrl.searchParams.set("count", "10");
    cefisUrl.searchParams.set("search", pergunta);

    let cefisResponse = await fetch(cefisUrl.toString(), {
      headers: {
        "Authorization": `Bearer ${cefisApiKey}`,
        "Accept": "application/json",
      },
    });

    let cefisResult = await cefisResponse.json();
    let coursesList = cefisResult.data || [];

    console.log(`Busca 1 (pergunta: "${pergunta}") retornou ${coursesList.length} cursos.`);

    if (coursesList.length === 0) {
      console.log("Nenhum curso específico encontrado. Realizando busca geral...");
      cefisUrl = new URL("https://api-v3.cefis.com.br/courses");
      cefisUrl.searchParams.set("count", "10");
      
      cefisResponse = await fetch(cefisUrl.toString(), {
        headers: {
          "Authorization": `Bearer ${cefisApiKey}`,
          "Accept": "application/json",
        },
      });
      cefisResult = await cefisResponse.json();
      coursesList = cefisResult.data || [];
    }

    const formattedCourses = coursesList.map((c: any) => ({
      title: c.title,
      summary: c.summary,
    }));

    // 2. Chama Claude API
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 1500,
        system: `Você é o Tutor CEFIS. Responda à dúvida do aluno de forma clara e adaptada ao nível dele, USANDO o conteúdo real da CEFIS fornecido. 
        Cite o curso da CEFIS relacionado quando houver (ex: 'Para se aprofundar, recomendo o curso X da CEFIS'). 
        Se o catálogo fornecido não cobrir a dúvida diretamente, responda com seu conhecimento técnico (contabilidade, impostos, carreira, etc), mas seja honesto e mencione que não há um curso específico sobre esse detalhe exato no catálogo atual da plataforma. 
        Nunca invente cursos ou títulos que não estão na lista.
        Sua resposta deve ser em texto puro, podendo usar markdown para formatação básica.`,
        messages: [
          {
            role: "user",
            content: `Perfil do Aluno:
            Nome: ${perfil.nome || 'Aluno'}
            Objetivo: ${perfil.objetivo}
            Nível: ${perfil.nivel}

            Cursos Disponíveis no Catálogo CEFIS:
            ${JSON.stringify(formattedCourses, null, 2)}

            Pergunta do Aluno: ${pergunta}`
          }
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      console.error("Claude API Error:", errText);
      throw new Error("Erro ao consultar o tutor.");
    }

    const claudeResult = await claudeResponse.json();
    let answer = claudeResult.content[0].text;
    
    // Limpeza de cercas markdown se a IA retornar a resposta dentro de blocos
    answer = answer.replace(/^```[a-z]*\n/i, "").replace(/\n```$/i, "").trim();

    return new Response(JSON.stringify({ resposta: answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});