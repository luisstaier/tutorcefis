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
    const { nome, objetivo, experiencia, nivel } = await req.json();
    
    const cefisApiKey = Deno.env.get("CEFIS_API_KEY");
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!cefisApiKey || !anthropicApiKey) {
      throw new Error("Configuração do servidor incompleta (API Keys ausentes).");
    }

    // 1. Buscar cursos relevantes na CEFIS
    const cefisUrl = new URL("https://api-v3.cefis.com.br/courses");
    cefisUrl.searchParams.set("count", "8");
    cefisUrl.searchParams.set("search", objetivo);

    const cefisResponse = await fetch(cefisUrl.toString(), {
      headers: {
        "Authorization": `Bearer ${cefisApiKey}`,
        "Accept": "application/json",
      },
    });

    if (!cefisResponse.ok) {
      throw new Error(`Erro na API CEFIS: ${cefisResponse.status}`);
    }

    const cefisResult = await cefisResponse.json();
    const coursesList = (cefisResult.data || []).map((c: any) => ({
      title: c.title,
      subtitle: c.subtitle,
      summary: c.summary,
      keywords: c.keywords
    }));

    // 2. Chamar Claude API para diagnóstico
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022", // Usando o modelo estável mais recente
        max_tokens: 1500,
        system: `Você é o Tutor CEFIS, um tutor de aprendizado pessoal. Analise o perfil do aluno e identifique as lacunas entre onde ele está e o objetivo dele. Use APENAS os cursos reais da CEFIS fornecidos como referência do que a plataforma oferece. Adapte a linguagem ao nível do aluno. NUNCA invente cursos que não estão na lista. Responda ESTRITAMENTE em JSON válido, sem nenhum texto fora do JSON, neste formato:
        { "lacunas": [ { "topico": string, "por_que_importa": string, "prioridade": "alta"|"media"|"baixa", "curso_cefis_relacionado": string } ] }
        Em curso_cefis_relacionado, use o título exato de um curso da lista, ou "" se nenhum cobrir o tópico.`,
        messages: [
          {
            role: "user",
            content: `Perfil do Aluno:
            Nome: ${nome}
            Objetivo: ${objetivo}
            Experiência: ${experiencia}
            Nível: ${nivel}

            Cursos Reais CEFIS:
            ${JSON.stringify(coursesList, null, 2)}`
          }
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      console.error("Claude API Error:", errText);
      throw new Error("Erro ao processar diagnóstico com IA.");
    }

    const claudeResult = await claudeResponse.json();
    const diagnosis = JSON.parse(claudeResult.content[0].text);

    return new Response(JSON.stringify(diagnosis), {
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
