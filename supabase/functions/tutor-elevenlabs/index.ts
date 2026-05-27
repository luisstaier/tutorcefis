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
      let t = text;

      // REMOVIDO: Substituições manuais de encoding Ã§ etc. que causavam mais problemas.
      // O Deno já trata JSON como UTF-8 corretamente.
      
      // 1. NORMALIZA UNICODE para garantir acentos compostos
      t = t.normalize('NFC');

      // 2. REMOVE MARKDOWN (Preservando acentos e ç)
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
        .replace(/\n{3,}/g,'\n\n');

      // 3. VALORES MONETÁRIOS - converte número em extenso (pt-BR conversacional)
      const numeroPorExtenso = (numStr: string): string => {
        // Remove separadores de milhar (.) e troca decimal (,) por (.)
        const limpo = numStr.replace(/\./g, '').replace(',', '.');
        const partes = limpo.split('.');
        const inteiro = parseInt(partes[0], 10) || 0;
        const centavos = partes[1] ? parseInt(partes[1].padEnd(2, '0').substring(0, 2), 10) : 0;

        const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
        const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
        const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
        const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

        const ate999 = (n: number): string => {
          if (n === 0) return '';
          if (n === 100) return 'cem';
          const c = Math.floor(n / 100);
          const resto = n % 100;
          const d = Math.floor(resto / 10);
          const u = resto % 10;
          const parts: string[] = [];
          if (c > 0) parts.push(centenas[c]);
          if (resto > 0 && resto < 10) parts.push(unidades[u]);
          else if (resto >= 10 && resto < 20) parts.push(especiais[resto - 10]);
          else if (resto >= 20) {
            if (u === 0) parts.push(dezenas[d]);
            else parts.push(`${dezenas[d]} e ${unidades[u]}`);
          }
          return parts.join(' e ');
        };

        const porExtenso = (n: number): string => {
          if (n === 0) return 'zero';
          if (n < 0) return `menos ${porExtenso(-n)}`;
          const bilhoes = Math.floor(n / 1_000_000_000);
          const milhoes = Math.floor((n % 1_000_000_000) / 1_000_000);
          const milhares = Math.floor((n % 1_000_000) / 1000);
          const resto = n % 1000;
          const parts: string[] = [];
          if (bilhoes > 0) parts.push(bilhoes === 1 ? 'um bilhão' : `${ate999(bilhoes)} bilhões`);
          if (milhoes > 0) parts.push(milhoes === 1 ? 'um milhão' : `${ate999(milhoes)} milhões`);
          if (milhares > 0) {
            if (milhares === 1) parts.push('mil');
            else parts.push(`${ate999(milhares)} mil`);
          }
          if (resto > 0) parts.push(ate999(resto));
          return parts.join(' ');
        };

        const reaisTxt = inteiro === 0 ? '' : (inteiro === 1 ? 'um real' : `${porExtenso(inteiro)} reais`);
        const centavosTxt = centavos === 0 ? '' : (centavos === 1 ? 'um centavo' : `${porExtenso(centavos)} centavos`);
        if (reaisTxt && centavosTxt) return `${reaisTxt} e ${centavosTxt}`;
        return reaisTxt || centavosTxt || 'zero reais';
      };

      t = t
        .replace(/R\$\s?(\d[\d.,]*)/g, (_m, num) => numeroPorExtenso(num))
        .replace(/US\$\s?(\d[\d.,]*)/g,'$1 dólares')
        .replace(/€\s?(\d[\d.,]*)/g,'$1 euros')
        .replace(/(?<![A-Za-zÀ-ú\d])\$(\d)/g,'$1 dólares');

      // 4. PERCENTUAIS E NÚMEROS ESPECIAIS
      t = t
        .replace(/(\d+(?:[.,]\d+)?)\s*%/g,'$1 por cento')
        // "x" como multiplicação entre valores/números: "5.000,00 x 27,5%" -> "vezes"
        .replace(/(\d[\d.,]*\s*(?:reais|por cento)?)\s*[x×]\s*(\d)/gi, '$1 vezes $2')
        .replace(/nº\s?(\d+)/g,'número $1')
        .replace(/Nº\s?(\d+)/g,'Número $1')
        .replace(/art\.\s?(\d+)/gi,'Artigo $1')
        .replace(/§\s?(\d+)/g,'parágrafo $1');

      // 5. ORDINAIS
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
        .replace(/\b1ª/g,'primeira');

      // 6. SIGLAS CONTÁBEIS E FISCAIS
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
        .replace(/\bEIRELI\b/g,'Eireli');

      // 7. PAUSAS NATURAIS
      t = t
        .replace(/\. /g,'.  ')
        .replace(/: /g,':  ')
        .replace(/([!?]) /g,'$1  ')
        .replace(/\n\n/g,'\n\n  ');

      return t.trim();
    };

    const cleanText = processTextForAudio(text);

    const splitIntoChunks = (text: string, maxChars = 500) => {
      const paragraphs = text.split('\n\n');
      const chunks: string[] = [];

      for (const p of paragraphs) {
        let current = p.trim();
        while (current.length > maxChars) {
          let splitIndex = current.lastIndexOf('.', maxChars);
          if (splitIndex === -1) splitIndex = current.lastIndexOf(',', maxChars);
          if (splitIndex === -1) splitIndex = current.lastIndexOf(' ', maxChars);
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

    for (let i = 0; i < chunks.length; i++) {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
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

    const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combinedAudio = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of audioChunks) {
      combinedAudio.set(chunk, offset);
      offset += chunk.length;
    }

    let binary = "";
    const CHUNK_SIZE = 8192;
    for (let i = 0; i < combinedAudio.length; i += CHUNK_SIZE) {
      binary += String.fromCharCode.apply(null, Array.from(combinedAudio.subarray(i, i + CHUNK_SIZE)) as any);
    }
    const base64Audio = btoa(binary);

    return new Response(JSON.stringify({ audio: base64Audio }), {
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });

  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }
});