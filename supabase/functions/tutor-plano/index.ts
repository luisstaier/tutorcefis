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
    const { perfil, lacunas } = await req.json();
    
    const cefisApiKey = Deno.env.get("CEFIS_API_KEY");
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!cefisApiKey || !anthropicApiKey) {
      throw new Error("Configuração do servidor incompleta (API Keys ausentes).");
    }

    // 1. Buscar cursos relevantes na CEFIS baseado no objetivo do aluno
    const cefisUrl = new URL("https://api-v3.cefis.com.br/courses");
    cefisUrl.searchParams.set("count", "12");
    cefisUrl.searchParams.set("search", perfil.objetivo);

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
      duration: c.duration
    }));

    // 2. Chamar Claude API para montagem do plano
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2500,
        system: `Você é o Tutor CEFIS. Monte um plano de estudos sequencial e realista que leve o aluno do nível atual ao objetivo, resolvendo as lacunas na ordem certa. Use SOMENTE cursos da lista real da CEFIS fornecida (título exato). Quando uma lacuna não for coberta por nenhum curso da lista, crie um passo de material próprio e marque origem como 'gerado_pelo_tutor'. Responda ESTRITAMENTE em JSON válido, sem nenhum texto fora do JSON, neste formato: { "plano": [ { "passo": number, "titulo": string, "descricao": string, "origem": "catalogo_cefis"|"gerado_pelo_tutor", "fonte": string, "tempo_estimado_min": number } ] }. Em fonte, use o título exato do curso CEFIS, ou '' se for material gerado.`,
        messages: [
          {
            role: "user",
            content: `Perfil do Aluno:
            Nome: ${perfil.nome}
            Objetivo: ${perfil.objetivo}
            Experiência: ${perfil.experiencia}
            Nível: ${perfil.nivel}

            Lacunas Identificadas:
            ${JSON.stringify(lacunas, null, 2)}

            Catálogo Real CEFIS:
            ${JSON.stringify(coursesList, null, 2)}`
          }
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      console.error("Claude API Error:", errText);
      throw new Error("Erro ao gerar plano de estudos com IA.");
    }

    const claudeResult = await claudeResponse.json();
    const rawText = claudeResult.content[0].text;
    
    // Robust JSON extraction
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

    let planData;
    try {
      planData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Parse error:", cleanedText);
      throw new Error("Erro ao processar o plano de estudos.");
    }

    return new Response(JSON.stringify(planData), {
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
