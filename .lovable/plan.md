Vou realizar os ajustes urgentes solicitados para garantir a correta codificação de caracteres especiais na função ElevenLabs e melhorar a segurança da experiência do usuário, desativando a reprodução automática de áudio por padrão.

### 1. Correção de Encoding na Edge Function `tutor-elevenlabs`
- **Ajuste no Header:** Remover qualquer `charset=utf-8` extra do header `Content-Type` ao enviar a requisição para a API da ElevenLabs, mantendo apenas `application/json`.
- **Simplificação do Body:** Garantir que o `JSON.stringify` processe o texto normalizado (NFC) sem manipulações manuais de buffer que possam corromper os acentos.
- **Normalização:** Manter a normalização Unicode (NFC) no texto processado antes de enviá-lo para a ElevenLabs.
- **Preservação de Lógica:** Manter intacta a função `processTextForAudio` que lida com siglas e valores monetários.

### 2. Segurança e Experiência do Usuário no Frontend (`TutorApp.tsx`)
- **Voz Ativa OFF por padrão:** Alterar o estado inicial de `isVoiceActive` para `false`. Isso garante que o áudio não tente ser reproduzido automaticamente sem a intenção explícita do usuário na primeira interação.
- **Botão de Controle:** O usuário ainda poderá ativar a reprodução automática através do toggle no chat, mas a configuração padrão respeitará as restrições de navegadores mobile e evitará interrupções inesperadas.

### 3. Implantação e Verificação
- Implantar as Edge Functions atualizadas.
- Atualizar o código do frontend.
- O resultado esperado é que os acentos funcionem perfeitamente no áudio gerado e que o áudio só toque quando o usuário clicar em "Ouvir resposta" (a menos que ele ative manualmente a "Voz Ativa").
