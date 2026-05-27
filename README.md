# Tutor CEFIS IA

Tutor de aprendizado pessoal com Inteligência Artificial, criado para alunos da plataforma **CEFIS**. O Tutor entende o perfil, o objetivo e o nível do aluno, identifica lacunas de conhecimento, monta um plano de estudos personalizado usando o catálogo real de cursos da CEFIS e responde dúvidas por **texto ou voz** — com áudio gerado em português natural.

> Projeto desenvolvido com [Lovable](https://lovable.dev) e sincronizado com GitHub.

---

## ✨ O que a ferramenta faz

- **Login integrado com a CEFIS** — o aluno entra com o mesmo e-mail e senha que usa na plataforma CEFIS.
- **Perfil de aprendizado** — coleta nome, objetivo profissional, experiência, nível (iniciante, intermediário, avançado) e estilo de aprendizagem preferido (exemplos práticos, explicação teórica, direto ao ponto, analogias).
- **Diagnóstico de lacunas** — a IA analisa o perfil e aponta os tópicos prioritários que o aluno precisa estudar para atingir o objetivo, sempre cruzando com os **cursos reais** disponíveis no catálogo da CEFIS.
- **Plano de estudos personalizado** — gera uma trilha ordenada de cursos da CEFIS, com estimativa de tempo e justificativa de cada etapa.
- **Chat de dúvidas (texto e voz)**
  - Resposta em **markdown** com sugestão de curso relacionado.
  - **Gravação por microfone** transcrita por **Whisper (OpenAI)**.
  - **Resposta falada** sintetizada pela **ElevenLabs**, com pipeline de normalização de texto em PT-BR (acentos, números, moedas, abreviações jurídicas e contábeis como "LTDA", "S.A.", "EIRELI", etc.).
  - Indicador estilo **WhatsApp "digitando…"** enquanto a IA processa a resposta e o áudio.
- **Quiz e revisões** — geração de perguntas para fixar o conteúdo.
- **Consulta a transcrições reais de aulas** — quando disponível, a IA responde com base no conteúdo transcrito de uma aula específica da CEFIS, citando curso e aula como fonte.
- **Interface responsiva** — funciona bem em desktop e celular, com layouts adaptados para telas pequenas.

---

## 🧠 Modelos de IA utilizados

| Função | Modelo / Serviço |
|---|---|
| Diagnóstico, plano, dúvidas, quiz, transcrição contextual | **Anthropic Claude (claude-sonnet-4-6)** |
| Transcrição de áudio do aluno (fala → texto) | **OpenAI Whisper** |
| Síntese de voz (texto → fala em PT-BR) | **ElevenLabs** |

---

## 🏗️ Tecnologias

### Frontend
- **React 19** + **TypeScript**
- **TanStack Start v1** (full-stack React com SSR e server functions)
- **TanStack Router** (roteamento baseado em arquivos, type-safe)
- **TanStack Query** (data fetching e cache)
- **Vite 7** (build tool)
- **Tailwind CSS v4** (estilização via `src/styles.css` com tokens semânticos em `oklch`)
- **shadcn/ui** + **Radix UI** (componentes acessíveis)
- **Framer Motion** (animações)
- **React Hook Form** + **Zod** (formulários e validação)
- **Lucide React** (ícones)
- **Sonner** (toasts/notificações)

### Backend
- **Lovable Cloud** (Supabase gerenciado) para autenticação, banco de dados e storage
- **Supabase Edge Functions** (Deno) para a camada de integração com APIs externas:
  - `cefis-login` — login na API da CEFIS
  - `cefis-user`, `cefis-courses`, `cefis-lesson` — leitura do catálogo
  - `tutor-diagnostico` — análise de lacunas (Claude)
  - `tutor-plano` — geração da trilha de estudos (Claude)
  - `tutor-duvidas` — chat de dúvidas com sugestão de curso (Claude)
  - `tutor-transcricao` — resposta baseada em transcrição real de aula (Claude)
  - `tutor-quiz` — geração de perguntas (Claude)
  - `tutor-tempo` — estimativa de tempo de estudo
  - `tutor-whisper` — transcrição de áudio (OpenAI Whisper)
  - `tutor-elevenlabs` — síntese de voz com normalização de texto PT-BR (ElevenLabs)

### Integrações externas
- **API CEFIS v3** (`api-v3.cefis.com.br`) — cursos, aulas, transcrições
- **Anthropic API** (Claude)
- **OpenAI API** (Whisper)
- **ElevenLabs API** (TTS)

### Deploy
- Frontend hospedado pelo **Lovable** (preview e produção)
- Edge Functions deployadas automaticamente via Lovable Cloud
- Domínio público: **https://tutorcefis.lovable.app**

---

## 🚀 Rodando localmente

```bash
# instalar dependências
bun install

# subir o servidor de desenvolvimento
bun run dev
```

Variáveis de ambiente necessárias (configuradas via Lovable Cloud em produção):

- `CEFIS_API_KEY` — chave de fallback da API CEFIS
- `ANTHROPIC_API_KEY` — chave da Anthropic (Claude)
- `OPENAI_API_KEY` — chave da OpenAI (Whisper)
- `ELEVENLABS_API_KEY` — chave da ElevenLabs (TTS)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — geradas automaticamente pelo Lovable Cloud

---

## 📁 Estrutura principal

```
src/
  components/
    TutorApp.tsx         # tela principal do tutor (chat, plano, diagnóstico)
    CourseDetails.tsx    # detalhe de curso CEFIS
    Stepper.tsx          # onboarding em etapas
    ui/                  # componentes shadcn/ui
  routes/                # rotas TanStack (file-based)
  integrations/supabase/ # cliente Supabase (auto-gerado)
supabase/
  functions/             # Edge Functions Deno (ver lista acima)
  config.toml
```

---

## 🔐 Segurança

- Autenticação delegada à CEFIS; o token do usuário é usado para todas as chamadas autenticadas ao catálogo.
- Chaves de API de terceiros (Anthropic, OpenAI, ElevenLabs) ficam **apenas no servidor** (Edge Functions), nunca expostas ao cliente.
- Lovable Cloud com Row-Level Security habilitada nas tabelas.

---

## 📄 Licença

Projeto privado — uso interno CEFIS.
