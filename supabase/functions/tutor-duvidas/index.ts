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
    const body = await req.json();
    const { pergunta, perfil, userKey } = body;
    
    const validUserKey = userKey && userKey !== "undefined" && userKey !== "null" ? userKey : null;
    const cefisApiKey = validUserKey || Deno.env.get("CEFIS_API_KEY");
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!cefisApiKey || !anthropicApiKey) {
      throw new Error("Configuração do servidor incompleta (API Keys ausentes).");
    }

    // 1. Busca conteúdo real da CEFIS relacionado à pergunta
    let cefisUrl = new URL("https://api-v3.cefis.com.br/courses");
    cefisUrl.searchParams.set("count", "10");
    cefisUrl.searchParams.set("search", pergunta || "");

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
      id: c.id,
      title: c.title,
      summary: c.summary,
    }));

    // 2. Chama Claude API com o modelo e versão solicitados
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: `Você é o Tutor CEFIS. Responda à dúvida do aluno de forma clara e adaptada ao nível dele, USANDO o conteúdo real da CEFIS fornecido. 
        Cite o curso da CEFIS relacionado quando houver.
        Se o catálogo fornecido não cobrir a dúvida diretamente, responda com seu conhecimento técnico (contabilidade, impostos, carreira, etc), mas seja honesto e mencione que não há um curso específico sobre esse detalhe exato no catálogo atual da plataforma. 
        Nunca invente cursos ou títulos que não estão na lista.
        
        ESTILO DE APRENDIZAGEM: ${perfil?.estiloAprendizagem === "exemplos práticos" 
          ? "Sempre inclua 1-2 exemplos concretos e situações reais do dia a dia do aluno. Ex: se o aluno é dono de empresa, use exemplos da empresa dele."
          : perfil?.estiloAprendizagem === "explicação teórica"
          ? "Explique o conceito completo antes de dar exemplos. Seja preciso tecnicamente."
          : perfil?.estiloAprendizagem === "direto ao ponto"
          ? "Seja objetivo e conciso. Vá direto ao que importa, sem enrolação."
          : perfil?.estiloAprendizagem === "analogias"
          ? "Use analogias e comparações com situações conhecidas para explicar conceitos novos. Ex: 'Balanço Patrimonial é como uma foto da empresa.'"
          : "Sempre inclua pelo menos um exemplo prático e concreto na resposta."}
        
        SEMPRE fale diretamente com o aluno na segunda pessoa ('você', 'seu', 'sua'). NUNCA se refira ao aluno pelo nome na terceira pessoa (ex: ERRADO: 'Luis deve aprender', CERTO: 'você deve aprender'). Use o nome do aluno APENAS para cumprimentar ('Olá, Luis!') ou criar conexão emocional, nunca como sujeito de uma ação.

        Responda ESTRITAMENTE neste formato de texto (sem JSON, sem code fences):
        ###RESPOSTA###
        (sua resposta em markdown aqui, pode ter várias linhas, aspas, etc)
        ###CURSO_ID###
        (apenas o número do id do curso mais relevante, ou a palavra null)
        ###CURSO_TITULO###
        (apenas o título do curso mais relevante, ou a palavra null)
        ###FIM###`,
        messages: [
          {
            role: "user",
            content: `Perfil do Aluno:
            Nome: ${perfil?.nome || 'Aluno'}
            Objetivo: ${perfil?.objetivo || 'Não informado'}
            Nível: ${perfil?.nivel || 'Não informado'}

            Cursos Disponíveis no Catálogo CEFIS:
            ${JSON.stringify(formattedCourses, null, 2)}

            Pergunta do Aluno: ${pergunta}`
          }
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      console.error("Claude API ERROR Response:", errText);
      throw new Error(`Erro Claude API: ${errText}`);
    }

    const claudeResult = await claudeResponse.json();
    let rawContent = claudeResult.content[0].text.trim();
    
    // JSON parsing with cleanup
    if (rawContent.startsWith("```")) {
      rawContent = rawContent.replace(/^```json\s*/, "").replace(/```$/, "").trim();
    }
    
    const firstBrace = rawContent.indexOf("{");
    const lastBrace = rawContent.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      rawContent = rawContent.substring(firstBrace, lastBrace + 1);
    }

    const data = JSON.parse(rawContent);

    return new Response(JSON.stringify({ 
      resposta: data.resposta,
      curso_id: data.curso_id,
      curso_titulo: data.curso_titulo
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("DETAILED Edge Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});