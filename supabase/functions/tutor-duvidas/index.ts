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
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1500,
        system: `Você é o Tutor CEFIS. RESPONDA SEMPRE EM PORTUGUÊS DO BRASIL (pt-BR), com ortografia, gramática, acentuação e pontuação 100% corretas conforme o Acordo Ortográfico vigente. NUNCA use português de Portugal, espanhol, inglês ou misturas. Revise mentalmente a resposta antes de enviar para garantir que TODOS os acentos (á, é, í, ó, ú, ã, õ, â, ê, ô, à) e o cedilha (ç) estejam corretos. Palavras como "você", "não", "também", "função", "informações", "contábil", "ções" devem estar SEMPRE acentuadas corretamente. Responda à dúvida do aluno de forma clara e adaptada ao nível dele, USANDO o conteúdo real da CEFIS fornecido. 
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

        FORMATAÇÃO DE TABELAS: SEMPRE que apresentar dados comparativos, faixas, alíquotas, deduções ou colunas (ex: tabela de IRPF, Simples Nacional, faixas de cálculo), use OBRIGATORIAMENTE tabelas em markdown GFM no formato:
        | Coluna 1 | Coluna 2 | Coluna 3 |
        |----------|----------|----------|
        | dado     | dado     | dado     |
        NUNCA coloque dados tabulares em uma única linha com pipes (|) sem quebras de linha — isso quebra a renderização.

        Responda ESTRITAMENTE neste formato de texto (sem JSON, sem code fences):
        ###RESPOSTA###
        (sua resposta em markdown aqui, pode ter várias linhas, aspas, etc)
        ###CURSO_ID###
        (apenas o número do id do curso mais relevante, ou a palavra null)
        ###CURSO_TITULO###
        (apenas o título do curso mais relevante, ou a palavra null)
        ###FIM###
        PROIBIDO usar emojis (emoticons, símbolos gráficos) na sua resposta.`,
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
    const rawContent: string = claudeResult.content[0].text;

    // Parse delimitado (evita problemas de escaping de JSON com markdown)
    const pick = (start: string, end: string) => {
      const i = rawContent.indexOf(start);
      if (i === -1) return "";
      const from = i + start.length;
      const j = rawContent.indexOf(end, from);
      return (j === -1 ? rawContent.substring(from) : rawContent.substring(from, j)).trim();
    };

    let resposta = (pick("###RESPOSTA###", "###CURSO_ID###") || rawContent.trim()).normalize('NFC');
    const cursoIdRaw = pick("###CURSO_ID###", "###CURSO_TITULO###");
    const cursoTituloRaw = pick("###CURSO_TITULO###", "###FIM###").normalize('NFC');

    const cursoIdNum = parseInt(cursoIdRaw, 10);
    const curso_id = Number.isFinite(cursoIdNum) ? cursoIdNum : null;
    const curso_titulo = cursoTituloRaw && cursoTituloRaw.toLowerCase() !== "null" ? cursoTituloRaw : null;

    // Etapa de revisão ortográfica e gramatical pt-BR via Lovable AI Gateway
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (lovableKey && resposta) {
      try {
        const revisor = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: "Você é um revisor profissional de português do Brasil (pt-BR). Corrija APENAS erros de ortografia, acentuação (á, é, í, ó, ú, ã, õ, â, ê, ô, à), cedilha (ç), pontuação e gramática conforme o Acordo Ortográfico vigente. NÃO altere o sentido, o tom, a estrutura, a formatação markdown, listas, títulos, links, números ou termos técnicos. NÃO adicione comentários, explicações, preâmbulos ou aspas envolvendo o texto. Retorne SOMENTE o texto revisado."
              },
              { role: "user", content: resposta }
            ],
          }),
        });
        if (revisor.ok) {
          const rev = await revisor.json();
          const corrigido = rev?.choices?.[0]?.message?.content;
          if (typeof corrigido === "string" && corrigido.trim().length > 0) {
            resposta = corrigido.trim().normalize('NFC');
          }
        } else {
          console.warn("Revisor pt-BR falhou:", revisor.status, await revisor.text());
        }
      } catch (revErr) {
        console.warn("Erro na revisão pt-BR (mantendo original):", revErr);
      }
    }

    return new Response(JSON.stringify({ resposta, curso_id, curso_titulo }), {
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });

  } catch (error) {
    console.error("DETAILED Edge Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }
});