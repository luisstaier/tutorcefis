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
    const { minutos, topico, perfil } = await req.json();
    
    const cefisApiKey = Deno.env.get("CEFIS_API_KEY");
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!cefisApiKey || !anthropicApiKey) {
      throw new Error("Configuração do servidor incompleta (API Keys ausentes).");
    }

    // 1. Busca cursos/aulas reais da CEFIS sobre o tópico
    let cefisUrl = new URL(\"https://api-v3.cefis.com.br/courses\");
    cefisUrl.searchParams.set(\"count\", \"15\");
    cefisUrl.searchParams.set(\"search\", topico);

    let cefisResponse = await fetch(cefisUrl.toString(), {
      headers: {
        \"Authorization\": `Bearer ${cefisApiKey}`,
        \"Accept\": \"application/json\",
      },
    });

    let cefisResult = await cefisResponse.json();
    let rawCourses = cefisResult.data || [];

    // Fallback: Se não encontrar nada pelo tópico, busca cursos gerais para ter contexto
    if (rawCourses.length === 0) {
      console.log(`Nenhum curso encontrado para \"${topico}\". Buscando cursos gerais...`);
      const fallbackUrl = new URL(\"https://api-v3.cefis.com.br/courses\");
      fallbackUrl.searchParams.set(\"count\", \"10\");
      const fallbackResponse = await fetch(fallbackUrl.toString(), {
        headers: {
          \"Authorization\": `Bearer ${cefisApiKey}`,
          \"Accept\": \"application/json\",
        },
      });
      const fallbackResult = await fallbackResponse.json();
      rawCourses = fallbackResult.data || [];
    }

    const coursesList = rawCourses.map((c: any) => ({
      title: c.title,
      summary: c.summary,
      duration: c.duration // em segundos
    }));

    console.log(`Total de cursos reais da CEFIS obtidos: ${coursesList.length}`);

    // 2. Chama a Claude para montar a micro-trilha
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: \"claude-sonnet-4-6\",
        max_tokens: 2000,
        system: `Você é o Tutor CEFIS. O aluno tem ${minutos} minutos para aprender sobre ${topico}. 
        SUA MISSÃO: Monte uma micro-trilha que CABE exatamente no tempo informado (some os tempos; não ultrapasse).
        
        REGRA DE OURO: PRIORIZE incluir conteúdos REAIS da CEFIS listados no contexto.
        - Se um curso do catálogo CEFIS for minimamente relevante ao tópico, use-o!
        - Origem: \"catalogo_cefis\", Fonte: [Título Exato do Curso].
        - Use a duração real (duration) convertida para minutos se possível, ou estime uma parte do curso que caiba.
        
        - Só use \"gerado_pelo_tutor\" se o catálogo REAL não cobrir NADA do tópico ou se sobrar tempo após incluir os cursos principais.
        - Quando gerar conteúdo próprio, crie um resumo enxuto calibrado pelo tempo (~140 palavras por minuto).
        
        Responda ESTRITAMENTE em JSON válido, neste formato: 
        { 
          \"total_min\": number, 
          \"itens\": [ 
            { 
              \"titulo\": string, 
              \"resumo\": string, 
              \"origem\": \"catalogo_cefis\"|\"gerado_pelo_tutor\", 
              \"fonte\": string, 
              \"tempo_min\": number 
            } 
          ] 
        }`,
        messages: [
          {
            role: "user",
            content: `Perfil do Aluno: ${JSON.stringify(perfil)}
            Minutos disponíveis: ${minutos}
            Tópico: ${topico}
            
            Catálogo Real CEFIS:
            ${JSON.stringify(coursesList, null, 2)}`
          }
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      console.error("Claude API Error:", errText);
      throw new Error("Erro ao gerar sessão rápida com IA.");
    }

    const claudeResult = await claudeResponse.json();
    const rawText = claudeResult.content[0].text;
    
    // Limpeza robusta do JSON
    let cleanedText = rawText.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```json\s*/, "").replace(/```$/, "").trim();
    }
    
    const firstBrace = cleanedText.indexOf("{");
    const lastBrace = cleanedText.lastIndexOf("}");
    
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("A IA não retornou um formato de dados válido.");
    }
    
    cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);

    let sessionData;
    try {
      sessionData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Parse error:", cleanedText);
      throw new Error("Erro ao processar os dados da sessão.");
    }

    return new Response(JSON.stringify(sessionData), {
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
