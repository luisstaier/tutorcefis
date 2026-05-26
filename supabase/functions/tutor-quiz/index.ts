import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lessonId, courseTitle, lessonTitle, courseSummary, courseGoals, nivel, estiloAprendizagem } = await req.json();
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicApiKey) throw new Error("ANTHROPIC_API_KEY ausente");

    // 1. Tenta buscar transcrição (opcional)
    let cleanText = "";
    try {
      console.log(`Buscando transcrição para aula ${lessonId}...`);
      const subResponse = await fetch(`https://api-v3.cefis.com.br/lessons/${lessonId}/subtitles`);
      const subtitlesResult = await subResponse.json();
      const subtitles = Array.isArray(subtitlesResult) ? subtitlesResult : (subtitlesResult.data || []);
      const publishedSub = subtitles.find((s: any) => s.published);

      if (publishedSub?.url) {
        const textResponse = await fetch(publishedSub.url);
        const vttText = await textResponse.text();
        cleanText = vttText
          .substring(0, 5000)
          .replace(/WEBVTT[\s\S]*?\n\n/g, '')
          .replace(/\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}/g, '')
          .replace(/<[^>]*>/g, '')
          .trim();
      } else {
        console.log("Nenhuma legenda publicada encontrada para aula", lessonId);
      }
    } catch (e) {
      console.log("Erro ao buscar transcrição (seguindo sem ela):", e instanceof Error ? e.message : e);
    }

    // Monta o contexto que será dado ao modelo
    const goalsList = Array.isArray(courseGoals)
      ? courseGoals.join("\n- ")
      : (typeof courseGoals === "string" ? courseGoals : "");

    const hasTranscript = cleanText.length >= 50;
    const contextBlock = hasTranscript
      ? `Use ESTRITAMENTE o conteúdo da transcrição abaixo da aula "${lessonTitle || ''}" do curso "${courseTitle}".\n\nTRANSCRIÇÃO:\n${cleanText}`
      : `Não há transcrição disponível. Crie questões com base no contexto do curso e da aula:\n\nCURSO: ${courseTitle}\nAULA: ${lessonTitle || 'Aula do curso'}\nRESUMO: ${courseSummary || 'sem resumo'}\nOBJETIVOS DE APRENDIZAGEM:\n- ${goalsList || 'não informado'}\n\nGere 4 questões conceituais relevantes ao tema desta aula dentro do escopo do curso. Mantenha o nível ${nivel || 'intermediário'} e foque em aplicação prática.`;

    const model = "claude-sonnet-4-6";
    console.log(`Usando modelo: ${model} | comTranscricao: ${hasTranscript}`);

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1500,
        system: `Você é um professor que cria avaliações de múltipla escolha. 
        ESTILO DE ENSINO: ${estiloAprendizagem === "exemplos práticos" 
          ? "Sempre inclua 1-2 exemplos concretos e situações reais do dia a dia do aluno. Ex: se o aluno é dono de empresa, use exemplos da empresa dele."
          : estiloAprendizagem === "explicação teórica"
          ? "Explique o conceito completo antes de dar exemplos. Seja preciso tecnicamente."
          : estiloAprendizagem === "direto ao ponto"
          ? "Seja objetivo e conciso. Vá direto ao que importa, sem enrolação."
          : estiloAprendizagem === "analogias"
          ? "Use analogias e comparações com situações conhecidas para explicar conceitos novos. Ex: 'Balanço Patrimonial é como uma foto da empresa.'"
          : "Sempre inclua pelo menos um exemplo prático e concreto na resposta."}
        Responda ESTRITAMENTE em JSON válido, sem markdown ou comentários. Formato exato: { "questoes": [ { "pergunta": "...", "alternativas": {"a": "...", "b": "...", "c": "...", "d": "..."}, "correta": "a", "explicacao": "..." } ] }. Sempre 4 questões com 4 alternativas cada. Nível ${nivel || 'intermediário'}.`,
        messages: [{ role: "user", content: contextBlock }],
      }),
    });

    if (!claudeResponse.ok) {
      const err = await claudeResponse.text();
      console.error("Claude API Error:", err);
      throw new Error("Falha na API do Claude");
    }

    const claudeResult = await claudeResponse.json();
    const text = claudeResult.content[0].text;
    console.log("resposta bruta do quiz:", text);

    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("Resposta da IA não contém JSON válido");
    }
    const data = JSON.parse(text.substring(firstBrace, lastBrace + 1));

    return new Response(JSON.stringify({ ...data, _source: hasTranscript ? "transcricao" : "metadados" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in tutor-quiz:", error);
    return new Response(JSON.stringify({ fallback: true, error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
