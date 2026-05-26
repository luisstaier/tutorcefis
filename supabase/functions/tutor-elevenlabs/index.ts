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
    const voiceId = "IKne3meq5aSn9XLyUdCD"; // Charlie - energético e entusiasta

    if (!apiKey) {
      throw new Error("ELEVENLABS_API_KEY não configurada.");
    }

    // Limpeza de markdown e limite de 1000 caracteres
    const cleanForAudio = (text: string) => {
      return text
        .replace(/#{1,6}\s+/g, '')        // remove ## títulos
        .replace(/\*\*(.*?)\*\*/g, '$1')   // remove **negrito** mas mantém texto
        .replace(/\*(.*?)\*/g, '$1')       // remove *itálico*
        .replace(/`(.*?)`/g, '$1')         // remove `código`
        .replace(/^[-*+]\s+/gm, '')        // remove marcadores de lista
        .replace(/^\d+\.\s+/gm, '')        // remove listas numeradas
        .replace(/^>\s+/gm, '')            // remove blockquotes
        .replace(/\|.*?\|/g, '')           // remove tabelas
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → só texto
        .replace(/---+/g, '')              // remove separadores
        .replace(/\n{3,}/g, '\n\n')        // máximo 2 quebras de linha seguidas
        // Converte R$ para "reais" para soar natural no áudio:
        .replace(/R\$\s?(\d+[\d.,]*)/g, '$1 reais')
        // Remove $ solto (que não seja R$):
        .replace(/(?<!R)\$/g, '')
        .trim();
    };
    

    const addNaturalPauses = (text: string) => {
      return text
        .replace(/\. /g, '.  ')        // pausa após ponto
        .replace(/: /g, ':  ')         // pausa após dois pontos
        .replace(/\n\n/g, '\n\n  ')    // pausa entre parágrafos
        .replace(/([!?]) /g, '$1  ');  // pausa após exclamação/interrogação
    };

    const cleanText = addNaturalPauses(cleanForAudio(text));

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
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: chunks[i],
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.80,
            style: 0.60,
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
