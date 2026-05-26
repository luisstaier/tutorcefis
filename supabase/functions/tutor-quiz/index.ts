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
      return new Response(JSON.stringify({ fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Chama Claude para gerar o quiz
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
        system: `Crie 4 questões de múltipla escolha baseadas ESTRITAMENTE no conteúdo da transcrição fornecida. Nível ${nivel || 'intermediário'}. Cada questão tem 4 alternativas (a,b,c,d), uma correta. Responda ESTRITAMENTE em JSON (limpe cercas markdown): { "questoes": [ { "pergunta": "...", "alternativas": {"a": "...", "b": "...", "c": "...", "d": "..."}, "correta": "a", "explicacao": "..." } ] }`,
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
    let rawContent = claudeResult.content[0].text.trim();
    
    // Limpeza de cercas markdown
    const firstBrace = rawContent.indexOf("{");
    const lastBrace = rawContent.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      rawContent = rawContent.substring(firstBrace, lastBrace + 1);
    }
    
    const data = JSON.parse(rawContent);

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
