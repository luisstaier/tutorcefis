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
    const { pergunta, perfil } = body;
    
    const cefisApiKey = Deno.env.get("CEFIS_API_KEY");
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!cefisApiKey || !anthropicApiKey) {
      throw new Error("Configuração do servidor incompleta (API Keys ausentes).");
    }

    // 1. Busca cursos relevantes
    const searchUrl = new URL("https://api-v3.cefis.com.br/courses");
    searchUrl.searchParams.set("search", pergunta);
    searchUrl.searchParams.set("count", "1");

    const searchRes = await fetch(searchUrl.toString(), {
      headers: { "Authorization": `Bearer ${cefisApiKey}` }
    });
    const searchData = await searchRes.json();
    const course = searchData.data?.[0];

    if (!course) {
      console.log("Nenhum curso encontrado para transcrição. Fallback.");
      return new Response(JSON.stringify({ error: "no_transcription" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Busca as aulas
    const lessonsRes = await fetch(`https://api-v3.cefis.com.br/courses/${course.id}/lessons`, {
      headers: { "Authorization": `Bearer ${cefisApiKey}` }
    });
    const lessonsData = await lessonsRes.json();
    const lesson = lessonsData.data?.[0]; // Pega a primeira aula

    if (!lesson) {
      console.log("Nenhuma aula encontrada para o curso. Fallback.");
      return new Response(JSON.stringify({ error: "no_transcription" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Busca a transcrição
    const subtitlesRes = await fetch(`https://api-v3.cefis.com.br/lessons/${lesson.id}/subtitles`);
    const subtitlesData = await subtitlesRes.json();
    const publishedSubtitle = subtitlesData.data?.find((s: any) => s.status === "published");

    if (!publishedSubtitle || !publishedSubtitle.url) {
      console.log("Nenhuma transcrição publicada encontrada. Fallback.");
      return new Response(JSON.stringify({ error: "no_transcription" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Baixa o conteúdo da transcrição
    const transcriptRes = await fetch(publishedSubtitle.url);
    let transcriptText = await transcriptRes.text();
    transcriptText = transcriptText.substring(0, 6000);

    // 5. Chama Claude
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
        system: `Você é o Tutor CEFIS. Responda à pergunta do aluno usando o TRECHO REAL da transcrição da aula da CEFIS fornecido abaixo. 
        Baseie-se nesse conteúdo, cite o curso e a aula como fonte. 
        Se a transcrição não cobrir a pergunta, diga e responda com cautela baseado no seu conhecimento geral, mas priorizando o contexto da CEFIS. 
        Nunca invente cursos ou fatos que não estejam no texto.`,
        messages: [
          {
            role: "user",
            content: `Pergunta do Aluno: ${pergunta}
            
            Contexto do Curso:
            Curso: ${course.title}
            Aula: ${lesson.title}
            
            Trecho da Transcrição:
            ${transcriptText}`
          }
        ],
      }),
    });

    if (!claudeResponse.ok) {
      throw new Error(`Claude API error: ${await claudeResponse.text()}`);
    }

    const claudeResult = await claudeResponse.json();
    let answer = claudeResult.content[0].text;
    answer = answer.replace(/^```[a-z]*\n/i, "").replace(/\n```$/i, "").trim();

    return new Response(JSON.stringify({ 
      resposta: answer,
      fonte: {
        curso: course.title,
        aula: lesson.title,
        curso_id: course.id
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in tutor-transcricao:", error);
    return new Response(JSON.stringify({ error: "no_transcription", details: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
