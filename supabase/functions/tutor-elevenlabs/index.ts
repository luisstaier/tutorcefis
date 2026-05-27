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
    const { text } = await req.json();
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    const voiceId = "N2lVS1w4EtoT3dr4eOWO"; // Callum - entusiasmado e didático

    if (!apiKey) {
      throw new Error("ELEVENLABS_API_KEY não configurada.");
    }

    const processTextForAudio = (text: string) => {
      let t = text

      // ── 1. CORRIGE ENCODING CORROMPIDO (Latin-1 lido como UTF-8) ──
      t = t
        .replace(/Ã§/g,'ç').replace(/Ã£/g,'ã').replace(/Ã¡/g,'á')
        .replace(/Ã©/g,'é').replace(/Ã­/g,'í').replace(/Ã³/g,'ó')
        .replace(/Ãº/g,'ú').replace(/Ã¢/g,'â').replace(/Ãª/g,'ê')
        .replace(/Ã´/g,'ô').replace(/Ã /g,'à').replace(/Ãµ/g,'õ')
        .replace(/Ã‡/g,'Ç').replace(/Ãƒ/g,'Ã').replace(/Ã‰/g,'É')
        .replace(/Ã"/g,'Ó').replace(/Ãš/g,'Ú').replace(/Ã‚/g,'Â')
        .replace(/ÃŠ/g,'Ê').replace(/Ã"/g,'Ô').replace(/Ã€/g,'À')

      // ── 2. NORMALIZA UNICODE ──
      t = t.normalize('NFC')

      // ── 3. REMOVE MARKDOWN ──
      t = t
        .replace(/#{1,6}\s+/g,'')
        .replace(/\*\*(.*?)\*\*/gs,'$1')
        .replace(/\*(.*?)\*/gs,'$1')
        .replace(/__(.*?)__/gs,'$1')
        .replace(/_(.*?)_/gs,'$1')
        .replace(/`{1,3}(.*?)`{1,3}/gs,'$1')
        .replace(/^[-*+]\s+/gm,'')
        .replace(/^\d+\.\s+/gm,'')
        .replace(/^>\s+/gm,'')
        .replace(/\|.*?\|/g,'')
        .replace(/\[([^\]]+)\]\([^)]+\)/g,'$1')
        .replace(/---+/g,'')
        .replace(/===+/g,'')
        .replace(/\n{3,}/g,'\n\n')

      // ── 4. VALORES MONETÁRIOS ──
      t = t
        .replace(/R\$\s?(\d[\d.,]*)/g,'$1 reais')
        .replace(/US\$\s?(\d[\d.,]*)/g,'$1 dólares')
        .replace(/€\s?(\d[\d.,]*)/g,'$1 euros')
        .replace(/(?<![A-Za-zÀ-ú\d])\$(\d)/g,'$1 dólares')

      // ── 5. PERCENTUAIS E NÚMEROS ESPECIAIS ──
      t = t
        .replace(/(\d+(?:,\d+)?)\s*%/g,'$1 por cento')
        .replace(/nº\s?(\d+)/g,'número $1')
        .replace(/Nº\s?(\d+)/g,'Número $1')
        .replace(/art\.\s?(\d+)/gi,'Artigo $1')
        .replace(/§\s?(\d+)/g,'parágrafo $1')

      // ── 6. ORDINAIS ──
      t = t
        .replace(/\b13º/g,'décimo terceiro')
        .replace(/\b12º/g,'décimo segundo')
        .replace(/\b11º/g,'décimo primeiro')
        .replace(/\b10º/g,'décimo')
        .replace(/\b9º/g,'nono').replace(/\b8º/g,'oitavo')
        .replace(/\b7º/g,'sétimo').replace(/\b6º/g,'sexto')
        .replace(/\b5º/g,'quinto').replace(/\b4º/g,'quarto')
        .replace(/\b3º/g,'terceiro').replace(/\b2º/g,'segundo')
        .replace(/\b1º/g,'primeiro')
        .replace(/\b13ª/g,'décima terceira')
        .replace(/\b12ª/g,'décima segunda')
        .replace(/\b11ª/g,'décima primeira')
        .replace(/\b10ª/g,'décima')
        .replace(/\b3ª/g,'terceira').replace(/\b2ª/g,'segunda')
        .replace(/\b1ª/g,'primeira')

      // ── 7. SIGLAS CONTÁBEIS E FISCAIS ──
      t = t
        .replace(/\bPIS\b/g,'P I S')
        .replace(/\bCOFINS\b/g,'Cofins')
        .replace(/\bCSLL\b/g,'C S L L')
        .replace(/\bIRPJ\b/g,'I R P J')
        .replace(/\bIRPF\b/g,'I R P F')
        .replace(/\bICMS\b/g,'I C M S')
        .replace(/\bISSQN\b/g,'I S S Q N')
        .replace(/\bISS\b/g,'I S S')
        .replace(/\bFGTS\b/g,'F G T S')
        .replace(/\bINSS\b/g,'I N S S')
        .replace(/\bCLT\b/g,'C L T')
        .replace(/\bCPC\b/g,'C P C')
        .replace(/\bCFC\b/g,'C F C')
        .replace(/\bCRC\b/g,'C R C')
        .replace(/\bECD\b/g,'E C D')
        .replace(/\bECF\b/g,'E C F')
        .replace(/\bCNPJ\b/g,'C N P J')
        .replace(/\bCPF\b/g,'C P F')
        .replace(/\bMEI\b/g,'M E I')
        .replace(/\bSPED\b/g,'Sped')
        .replace(/\bDRE\b/g,'D R E')
        .replace(/\bCTN\b/g,'C T N')
        .replace(/\bOAB\b/g,'O A B')
        .replace(/\bIBGE\b/g,'I B G E')
        .replace(/\bIPCA\b/g,'I P C A')
        .replace(/\bSELIC\b/g,'Selic')
        .replace(/\bCDI\b/g,'C D I')
        .replace(/\bPGBL\b/g,'P G B L')
        .replace(/\bVGBL\b/g,'V G B L')
        .replace(/\bNFe\b/g,'Nota Fiscal Eletrônica')
        .replace(/\bNF-e\b/g,'Nota Fiscal Eletrônica')
        .replace(/\bCTe\b/g,'Conhecimento de Transporte Eletrônico')
        .replace(/\bLTDA\.?/g,'Limitada')
        .replace(/\bS\.A\.?/g,'Sociedade Anônima')
        .replace(/\bEIRELI\b/g,'Eireli')

      // ── 8. PAUSAS NATURAIS ──
      t = t
        .replace(/\. /g,'.  ')
        .replace(/: /g,':  ')
        .replace(/([!?]) /g,'$1  ')
        .replace(/\n\n/g,'\n\n  ')

      return t.trim()
    }

    const cleanText = processTextForAudio(text);

    const splitIntoChunks = (text: string, maxChars = 500) => {
      const paragraphs = text.split('\n\n');
      const chunks: string[] = [];

      for (const p of paragraphs) {
        let current = p.trim();
        while (current.length > maxChars) {
          // Busca o último ponto final antes do limite de 500 caracteres
          let splitIndex = current.lastIndexOf('.', maxChars);
          
          // Se não houver ponto, tenta vírgula
          if (splitIndex === -1) splitIndex = current.lastIndexOf(',', maxChars);
          
          // Se não houver vírgula, tenta espaço
          if (splitIndex === -1) splitIndex = current.lastIndexOf(' ', maxChars);
          
          // Se ainda assim não houver, corta no limite
          if (splitIndex === -1) splitIndex = maxChars;

          chunks.push(current.substring(0, splitIndex + 1).trim());
          current = current.substring(splitIndex + 1).trim();
        }
        if (current) chunks.push(current);
      }
      return chunks.filter(c => c.length > 0);
    };

    const chunks = splitIntoChunks(cleanText);
    const audioChunks: Uint8Array[] = [];

    console.log(`Processando ${chunks.length} blocos de áudio para ElevenLabs.`);

    for (let i = 0; i < chunks.length; i++) {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          text: chunks[i],
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.80,
            style: 0.55,
            use_speaker_boost: true
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`Erro ElevenLabs no bloco ${i}:`, errorData);
        continue;
      }

      const audioBuffer = await response.arrayBuffer();
      audioChunks.push(new Uint8Array(audioBuffer));
    }

    if (audioChunks.length === 0) {
      throw new Error("Não foi possível gerar nenhum áudio.");
    }

    // Concatena todos os chunks de áudio (MP3)
    const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combinedAudio = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of audioChunks) {
      combinedAudio.set(chunk, offset);
      offset += chunk.length;
    }

    // Converte para base64
    let binary = "";
    const CHUNK_SIZE = 8192;
    for (let i = 0; i < combinedAudio.length; i += CHUNK_SIZE) {
      binary += String.fromCharCode.apply(null, Array.from(combinedAudio.subarray(i, i + CHUNK_SIZE)) as any);
    }
    const base64Audio = btoa(binary);

    return new Response(JSON.stringify({ audio: base64Audio }), {
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
