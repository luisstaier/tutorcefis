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
    const { perfil, lacunas, userKey } = body;
    
    const cefisApiKey = userKey || Deno.env.get("CEFIS_API_KEY");
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!cefisApiKey || !anthropicApiKey) {
      throw new Error("Configuração do servidor incompleta (API Keys ausentes).");
    }

    // 1. Buscar cursos relevantes na CEFIS
    let cefisUrl = new URL("https://api-v3.cefis.com.br/courses");
    cefisUrl.searchParams.set("count", "15");
    cefisUrl.searchParams.set("search", perfil.objetivo);

    let cefisResponse = await fetch(cefisUrl.toString(), {
      headers: {
        "Authorization": `Bearer ${cefisApiKey}`,
        "Accept": "application/json",
      },
    });

    let cefisResult = await cefisResponse.json();
    let coursesList = cefisResult.data || [];

    console.log(`Busca 1 (objetivo: "${perfil.objetivo}") retornou ${coursesList.length} cursos.`);

    // Se vierem poucos cursos, faz uma segunda busca geral (sem search)
    if (coursesList.length < 8) {
      console.log("Poucos cursos encontrados. Realizando busca geral...");
      cefisUrl = new URL("https://api-v3.cefis.com.br/courses");
      cefisUrl.searchParams.set("count", "15");
      
      cefisResponse = await fetch(cefisUrl.toString(), {
        headers: {
          "Authorization": `Bearer ${cefisApiKey}`,
          "Accept": "application/json",
        },
      });
      cefisResult = await cefisResponse.json();
      const generalCourses = cefisResult.data || [];
      console.log(`Busca 2 (geral) retornou ${generalCourses.length} cursos.`);
      
      const existingIds = new Set(coursesList.map((c: any) => c.id));
      generalCourses.forEach((c: any) => {
        if (!existingIds.has(c.id)) {
          coursesList.push(c);
        }
      });
    }

    const formattedCourses = coursesList.map((c: any) => ({
      id: c.id,
      title: c.title,
      subtitle: c.subtitle,
      summary: c.summary,
      duration: c.duration
    }));

    console.log(`Total de cursos reais enviados ao Tutor: ${formattedCourses.length}`);

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
        system: `Você é o Tutor CEFIS. Monte um plano de estudos sequencial e realista que leve o aluno do nível atual ao objetivo, resolvendo as lacunas na ordem certa. 
        
        REGRA MANDATÓRIA: Use APENAS cursos reais da CEFIS da lista fornecida. 
        - Origem: 'catalogo_cefis'.
        - Fonte: Título exato do curso da lista.
        - Descrição: Um breve resumo de por que este curso é importante para o aluno.
        - Tempo: Use a duração real (duration) convertida para minutos ou estime o tempo de estudo.
        
        SEMPRE fale diretamente com o aluno na segunda pessoa ('você', 'seu', 'sua'). NUNCA se refira ao aluno pelo nome na terceira pessoa (ex: ERRADO: 'Luis deve aprender', CERTO: 'você deve aprender'). Use o nome do aluno APENAS para cumprimentar ('Olá, Luis!') ou criar conexão emocional, nunca como sujeito de uma ação.

        NÃO gere conteúdo próprio ('gerado_pelo_tutor') a menos que seja um passo introdutório ou de conclusão muito curto (máximo 1 item do plano). O coração do plano deve ser o catálogo da CEFIS.
        
        Responda ESTRITAMENTE em JSON válido, neste formato: 
        { 
          "plano": [ 
            { 
              "passo": number, 
              "titulo": string, 
              "descricao": string, 
              "origem": "catalogo_cefis"|"gerado_pelo_tutor", 
              "fonte": string, 
              "curso_id": number,
              "tempo_estimado_min": number 
            } 
          ] 
        }.`,
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

            Catálogo Real CEFIS (Use preferencialmente estes cursos):
            ${JSON.stringify(formattedCourses, null, 2)}`
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
