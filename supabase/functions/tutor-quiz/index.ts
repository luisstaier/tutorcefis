import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lessonId, courseTitle, nivel } = await req.json();
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicApiKey) throw new Error("ANTHROPIC_API_KEY ausente");

    // 1. Busca transcrição
    console.log(`Buscando transcrição para aula ${lessonId}...`);
    const subResponse = await fetch(`https://api-v3.cefis.com.br/lessons/${lessonId}/subtitles`);
    const subtitlesResult = await subResponse.json();
    const subtitles = Array.isArray(subtitlesResult) ? subtitlesResult : (subtitlesResult.data || []);
    const publishedSub = subtitles.find((s: any) => s.published);

    if (!publishedSub || !publishedSub.url) {
      console.log("Nenhuma legenda publicada encontrada para aula", lessonId);
      return new Response(JSON.stringify({ fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Busca texto da legenda
    const textResponse = await fetch(publishedSub.url);
    const vttText = await textResponse.text();
    // Limpeza básica de VTT para economizar tokens
    const cleanText = vttText
      .substring(0, 5000)
      .replace(/WEBVTT[\s\S]*?\n\n/g, '')
      .replace(/\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}/g, '')
      .replace(/<[^>]*>/g, '')
      .trim();

    if (!cleanText || cleanText.length < 50) {
      console.log("Legenda muito curta ou vazia para aula", lessonId);
      return new Response(JSON.stringify({ fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const model = "claude-sonnet-4-6";
    console.log(`Usando modelo: ${model}`);

    // 3. Chama Claude para gerar o quiz
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 1500,
        system: `Crie 4 questões de múltipla escolha baseadas ESTRITAMENTE no conteúdo da transcrição fornecida. Nível ${nivel || 'intermediário'}. Cada questão tem 4 alternativas (a,b,c,d), uma correta. Responda ESTRITAMENTE em JSON válido, sem texto explicativo fora do JSON. Formato: { "questoes": [ { "pergunta": "...", "alternativas": {"a": "...", "b": "...", "c": "...", "d": "..."}, "correta": "a", "explicacao": "..." } ] }`,
        messages: [
          { 
            role: "user", 
            content: `Transcrição da aula do curso "${courseTitle}":\n\n${cleanText}` 
          }
        ],
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
    
    // Limpeza de cercas markdown: extrai do primeiro { até o último }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
      console.error("JSON não encontrado na resposta:", text);
      throw new Error("Resposta da IA não contém JSON válido");
    }

    const clean = text.substring(firstBrace, lastBrace + 1);
    console.log("Conteúdo extraído para parse:", clean);
    const data = JSON.parse(clean);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in tutor-quiz:", error);
    return new Response(JSON.stringify({ fallback: true, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});