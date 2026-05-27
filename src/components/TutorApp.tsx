import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Clock, BookOpen, User, Search, Loader2, Star, PlayCircle, MessageCircle, Send, Home, ClipboardCheck, LayoutDashboard, Zap, Library, CheckCircle2, LogOut, Mic, Volume2, Pause, Play, Square, Sparkles, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { Toaster, toast } from "sonner";
import { TutorAiLogo } from "./TutorAiLogo";
import CourseDetails from "./CourseDetails";

const safeStorage = {
  getLocal(key: string) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setLocal(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  removeLocal(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
  getSession(key: string) {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setSession(key: string, value: string) {
    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  removeSession(key: string) {
    try {
      sessionStorage.removeItem(key);
    } catch {}
  },
};

async function invokeTutorFunction<T = any>(
  name: string,
  body?: FormData | Record<string, unknown>,
): Promise<{ data: T; error: null }> {
  try {
    const result = await supabase.functions.invoke(name, { body });
    if (result.error) throw result.error;
    return { data: result.data as T, error: null };
  } catch (supabaseError) {
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!baseUrl || !publishableKey) {
      throw supabaseError;
    }

    const headers: Record<string, string> = {
      apikey: publishableKey,
      authorization: `Bearer ${publishableKey}`,
    };

    const init: RequestInit = {
      method: "POST",
      headers,
    };

    if (body instanceof FormData) {
      init.body = body;
      delete headers["content-type"];
    } else if (body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}/functions/v1/${name}`, init);
    const raw = await response.text();
    let data: T | null = null;

    if (raw) {
      try {
        data = JSON.parse(raw) as T;
      } catch {
        throw new Error("Resposta inválida do servidor.");
      }
    }

    if (!response.ok) {
      const message =
        data && typeof data === "object" && "error" in (data as object)
          ? String((data as { error?: unknown }).error ?? "Erro ao processar solicitação.")
          : "Erro ao processar solicitação.";
      throw new Error(message);
    }

    return { data: (data ?? ({} as T)) as T, error: null };
  }
}

const MarkdownRenderer = ({ 
  content, 
  className = "", 
  courseName, 
  courseId, 
  onCourseClick,
  isTyping = false
}: { 
  content: string; 
  className?: string;
  courseName?: string;
  courseId?: number;
  onCourseClick?: (id: number, title: string) => void;
  isTyping?: boolean;
}) => {
  const [displayedText, setDisplayedText] = useState(isTyping ? "" : content);
  
  useEffect(() => {
    if (!isTyping) {
      setDisplayedText(content);
      return;
    }

    let currentText = "";
    let i = 0;
    const speed = 20; // ms por caractere

    const timer = setInterval(() => {
      if (i < content.length) {
        currentText += content[i];
        setDisplayedText(currentText);
        i++;
      } else {
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [content, isTyping]);

  const processedContent = useMemo(() => {
    if (!courseName || !courseId || !onCourseClick) return displayedText;
    
    const escapedName = courseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(["'])(${escapedName})\\1|(${escapedName})`, 'i');
    
    const match = displayedText.match(regex);
    if (!match) return displayedText;

    const matchedText = match[0];
    const startIndex = match.index!;
    
    return (
      displayedText.slice(0, startIndex) + 
      `[${matchedText}](course://${courseId})` + 
      displayedText.slice(startIndex + matchedText.length)
    );
  }, [displayedText, courseName, courseId, onCourseClick]);

  return (
    <div className={cn("text-sm", className)}>
      <ReactMarkdown 
        components={{
          h1: ({node, ...props}) => <h1 className="font-serif text-xl font-bold mb-3 text-foreground" {...props} />,
          h2: ({node, ...props}) => <h2 className="font-serif text-lg font-bold mb-2 text-foreground" {...props} />,
          h3: ({node, ...props}) => <h3 className="font-serif text-md font-bold mb-2 text-foreground" {...props} />,
          p: ({node, ...props}) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
          li: ({node, ...props}) => <li className="mb-1" {...props} />,
          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-accent pl-4 italic my-4 text-secondary bg-accent/5 py-2 rounded-r" {...props} />,
          strong: ({node, ...props}) => <strong className="font-bold text-accent" {...props} />,
          a: ({node, ...props}) => {
            const href = props.href || "";
            if (href.startsWith("course://")) {
              const id = parseInt(href.replace("course://", ""));
              return (
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    onCourseClick?.(id, props.children?.toString() || "");
                  }}
                  className="text-accent underline hover:text-accent/80 transition-colors font-bold decoration-[#b3e51d]"
                >
                  {props.children}
                </button>
              );
            }
            return <a className="text-accent underline hover:text-accent/80 transition-colors" target="_blank" rel="noopener noreferrer" {...props} />;
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
      {isTyping && displayedText.length < content.length && (
        <span className="inline-block w-1 h-4 ml-1 bg-accent animate-pulse align-middle" />
      )}
    </div>
  );
};

const CefisLogo = ({ className = "" }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 1862.89 641.11" 
    className={className}
    fill="currentColor"
  >
    <path d="M1862.89,340.46c-.78,6.53-1.54,13.07-2.35,19.59-8,63.91-32.87,120.52-74.93,169.23C1735.3,587.53,1672,624.33,1596,636.44,1491.8,653,1399.79,625.5,1322.17,553.77c-52.5-48.51-85.11-108.81-96.28-179.37-16.47-104.12,11-196,82.75-273.6,48.45-52.35,108.82-83.89,179.08-96.3,10.74-1.9,21.7-2.57,32.55-3.84a8.6,8.6,0,0,0,1.88-.66H1562a35.74,35.74,0,0,0,3.53.75c10.3,1.24,20.69,1.94,30.89,3.74C1667,17,1727.17,49.07,1776.18,101.3,1823.72,152,1851.77,212,1860.53,281c.83,6.54,1.58,13.08,2.36,19.62Zm-320.83-254c-129.18,0-234.16,104.63-234.22,233.76-.06,128.56,102.79,231.63,229.1,234.27,131.41,2.74,237-101.75,239.37-229.37C1778.78,192.82,1671.92,86.34,1542.06,86.5Z"/>
    <path d="M474.76,267.24v56.52H358.91v93.06H488.07V473h-199V128.08H481.31v59.54H362.14v79.62Z"/>
    <path d="M1107,141.56c-5,19.07-10,37.83-15,57-16.45-9.75-34.3-13.27-52.46-15.4a76.54,76.54,0,0,0-38.32,4.83c-26.14,10.67-31,40.06-9.84,59,9,8,19.38,13.8,30.26,18.65,20.52,9.14,40.49,19.23,58.55,32.66,18.27,13.59,31.93,30.6,37.23,53.25,8.31,35.59-4.17,86.58-52.58,111-18.77,9.48-38.79,13.61-59.62,14.2-34.09,1-66.76-6.18-98.75-17.31-3.14-1.09-3.93-2.27-3.08-5.61,4.48-17.67,8.67-35.41,12.95-53.06,23.89,12,49.42,16.55,75.6,18.25,12.86.84,25.4-.75,37-7a37.57,37.57,0,0,0,9.21-59.1c-9.11-9.42-20.52-15.46-32-21.28-20.47-10.4-40.91-20.74-59.58-34.33-17.42-12.69-31.07-28.19-36.81-49.17-8.8-32.21.55-60.14,22.79-84,20-21.44,45.76-32.1,74.3-36.13,33.18-4.67,65.34.42,96.61,11.9C1104.51,140.34,1105.48,140.86,1107,141.56Z"/>
    <path d="M232.72,195.54c-18.09-7.63-36.71-12-56.16-12.41-48.95-1-81.22,27.36-94.55,68.81-12.17,37.83-10.79,76,4.4,112.88,13.4,32.51,39.23,49.81,73.66,54.49,23.66,3.21,46.61-.28,68.87-8.71l5.11-1.92c3.29,18.5,6.54,36.82,9.93,55.93-7.69,2.27-15.23,4.83-22.94,6.72a240.25,240.25,0,0,1-80.29,6.31A152.62,152.62,0,0,1,7.9,368.08c-9.36-32-9.75-64.31-4.58-96.93,4.26-26.88,12.36-52.37,27-75.57,20.45-32.35,49.93-52.14,86.23-62.7,22.9-6.66,46.39-7.26,69.94-6.93,14.85.2,29.57,1.85,43.83,6.22A127.44,127.44,0,0,1,245,138c1,.44,2.19,2.37,2,3.29-4.39,17.84-9,35.62-13.55,53.42C233.33,194.91,233.07,195.1,232.72,195.54Z"/>
    <path d="M608.14,187.52v86.4H720.66v56.51H608.06V473H538.4V128.12h189v59.4Z"/>
    <path d="M784.41,131.4h69.33V473H784.41Z"/>
    <path d="M1520.6,507a191.57,191.57,0,0,0-6.76-47.86c-12.76-46.73-39.2-82.81-82.8-105.31-21-10.83-43.47-17.06-66.83-19.94-12.76-1.58-25.62-2.25-39-3.37.77-1.94,1.52-4.21,2.55-6.35,10.28-21.43,23.58-41,38.12-59.67,27.28-35.12,58.7-66.23,92.56-95a7.49,7.49,0,0,1,4.37-1.76q107.4-.09,214.82,0a3.05,3.05,0,0,1,.54.14c0,.34,0,.82-.16,1-27.26,29.61-49,63.1-68.47,98.11-36.59,65.79-62.17,135.78-79.09,209-2.14,9.29-4,18.65-6,28C1524.11,506,1524,508.42,1520.6,507Z"/>
    <path d="M1534.78,508.91c2.67-9.93,5.31-20.05,8.14-30.12,15-53.49,32-106.33,54.07-157.41,9.23-21.33,19.54-42.1,32-61.77,2.31-3.63,4.42-4.77,8.89-4,29.19,4.8,58.45,9.2,88.19,13.81a15.8,15.8,0,0,1-1.79,1.87c-35.23,25.67-65.81,56.23-93.73,89.52a605.92,605.92,0,0,0-91.18,146.3C1538.62,508.86,1538.12,511.48,1534.78,508.91Z"/>
    <path d="M1544.15,509.74c5.21-10.16,10.12-20.48,15.68-30.44,29.07-52,64.35-99.61,104.08-143.95q8.86-9.89,18.08-19.45c.93-1,3-1.86,4.1-1.51,21.64,6.71,43.22,13.62,64.81,20.5.35.12.62.49.87.69-82,42.81-148.53,103.8-206.62,174.77Z"/>
  </svg>
);

export default function TutorApp() {
  const [step, setStep] = useState(-2); // -2: Checking Auth, -1: Login, 0: Onboarding, ...
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userKey, setUserKey] = useState<string | undefined>();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [previousStep, setPreviousStep] = useState(0);
  const [formData, setFormData] = useState({
    nome: "",
    objetivo: "",
    experiencia: "",
    nivel: "",
    estiloAprendizagem: "",
  });

  const [modoData, setModoData] = useState({
    minutos: "",
    topico: "",
  });
  
  const [searchQuery, setSearchQuery] = useState("");
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [completedLessons, setCompletedLessons] = useState<Record<number, number[]>>({}); 
  const [diagnosis, setDiagnosis] = useState<any[]>([]);
  const [studyPlan, setStudyPlan] = useState<any[]>([]);
  const [quickSession, setQuickSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isGeneratingSession, setIsGeneratingSession] = useState(false);
  const [navigationContext, setNavigationContext] = useState<{ source: string; trail?: any[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duvida, setDuvida] = useState("");
  const [chatHistory, setChatHistory] = useState<{
    pergunta: string;
    resposta: string;
    fonte?: { curso: string; aula: string; curso_id?: number };
    isNew?: boolean;
  }[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<number | null>(null);
  const [isPreparingAudio, setIsPreparingAudio] = useState<number | null>(null);
  const [selectedAiContent, setSelectedAiContent] = useState<{ titulo: string; conteudo: string } | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [audioCache, setAudioCache] = useState<Record<string, string>>({});

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const persistProfile = (profile: typeof formData) => {
    safeStorage.setLocal("tutor_cefis_profile", JSON.stringify(profile));
  };

  const generateAudio = async (text: string): Promise<string | null> => {
    // Cache key based on text and voice (voice_id is currently hardcoded in function)
    const cacheKey = btoa(unescape(encodeURIComponent(text.slice(0, 100) + text.length)));
    if (audioCache[cacheKey]) {
      return audioCache[cacheKey];
    }

    try {
      const { data } = await invokeTutorFunction<{ audio: string }>('tutor-elevenlabs', { text });
      if (!data || !data.audio) return null;
      const byteCharacters = atob(data.audio);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      
      setAudioCache(prev => ({ ...prev, [cacheKey]: url }));
      return url;
    } catch (err) {
      console.error("Erro ao gerar áudio:", err);
      return null;
    }
  };

  const askQuestion = async (questionText: string) => {
    if (!questionText.trim()) return;

    const q = questionText.trim();
    setDuvida("");
    setIsAsking(true);

    try {
      let finalResponse = "";
      let finalFonte: any = undefined;

      // 1. Inicia o carregamento da resposta (texto e depois áudio se voz ativa)
      const { data } = await invokeTutorFunction<{
        resposta?: string;
        fonte?: { curso: string; aula: string; curso_id?: number };
        error?: string;
      }>("tutor-transcricao", {
        pergunta: q,
        perfil: formData,
        userKey,
      });

      if (!data || data.error || !data.resposta) {
        const { data: duvData } = await invokeTutorFunction<{
          resposta: string;
          curso_id?: number;
          curso_titulo?: string;
        }>("tutor-duvidas", {
          pergunta: q,
          perfil: formData,
          userKey,
        });
        finalResponse = duvData.resposta;
        finalFonte = duvData.curso_id
          ? { curso: duvData.curso_titulo || "CEFIS", aula: "Geral", curso_id: duvData.curso_id }
          : undefined;
      } else {
        finalResponse = data.resposta;
        finalFonte = data.fonte;
      }

      // 2. Gera áudio ANTES de mostrar se voz ativa, para sincronizar
      let audioUrl = null;
      if (isVoiceActive && finalResponse) {
        audioUrl = await generateAudio(finalResponse);
      }

      // 3. Mostra a mensagem e inicia áudio simultaneamente
      const nextIndex = chatHistory.length;
      setChatHistory((prev) => [
        ...prev.map(msg => ({ ...msg, isNew: false })), // Garante que apenas a última seja 'isNew'
        {
          pergunta: q,
          resposta: finalResponse,
          fonte: finalFonte,
          isNew: true
        },
      ]);

      if (audioUrl) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        setCurrentlyPlayingId(nextIndex);
        audio.onended = () => setCurrentlyPlayingId(null);
        audio.play().catch(err => {
          console.error("Erro ao reproduzir áudio:", err);
        });
      }
    } finally {
      setIsAsking(false);
    }
  };

  useEffect(() => {
    try {
      const savedKey = safeStorage.getSession("cefis_user_key");
      const savedProfile = safeStorage.getLocal("tutor_cefis_profile");
      const validKey = savedKey && savedKey !== "undefined" && savedKey !== "null" ? savedKey : null;

      if (validKey && savedProfile) {
        setUserKey(validKey);
        try { setFormData(JSON.parse(savedProfile)); } catch { /* perfil corrompido, ignora */ }
        setIsAuthenticated(true);
        setStep(0);
      } else {
        if (savedKey) safeStorage.removeSession("cefis_user_key");
        setStep(-1);
      }

      const savedProgress = safeStorage.getLocal("tutor_cefis_progress");
      if (savedProgress) {
        try { setCompletedLessons(JSON.parse(savedProgress)); } catch { /* progresso corrompido, ignora */ }
      }
    } catch (err) {
      console.error("Erro ao carregar dados salvos:", err);
      setStep(-1);
    }
  }, []);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError(null);
    try {
      const { data } = await invokeTutorFunction<{
        error?: string;
        key?: string;
        userName?: string;
        occupation?: string;
        nivel?: number;
      }>('cefis-login', { email: loginEmail, pass: loginPass });
      if (data.error) throw new Error(data.error);
      if (!data.key) throw new Error("Não foi possível concluir o login no celular.");

      safeStorage.setSession("cefis_user_key", data.key);
      const profile = {
        nome: data.userName || "",
        experiencia: data.occupation || "",
        nivel: data.nivel === 1 ? "iniciante" : data.nivel === 2 ? "intermediário" : data.nivel === 3 ? "avançado" : "iniciante",
        objetivo: "",
        estiloAprendizagem: ""
      };
      persistProfile(profile);

      setUserKey(data.key);
      setFormData(profile);
      setIsAuthenticated(true);
      setStep(0);
      setIsProfileLoaded(true);
      toast.success("Conectado com sucesso!");
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    safeStorage.removeSession("cefis_user_key");
    safeStorage.removeLocal("tutor_cefis_profile");
    setUserKey(undefined);
    setIsAuthenticated(false);
    setStep(-1);
  };

  const handleCompleteLesson = (courseId: number, lessonId: number) => {
    setCompletedLessons(prev => {
      const courseLessons = prev[courseId] || [];
      if (courseLessons.includes(lessonId)) return prev;
      
      const newProgress = {
        ...prev,
        [courseId]: [...courseLessons, lessonId]
      };
      safeStorage.setLocal("tutor_cefis_progress", JSON.stringify(newProgress));
      toast.success("Aula marcada como concluída!");
      return newProgress;
    });
  };

  const isLessonCompleted = (courseId: number, lessonId: number) => {
    return completedLessons[courseId]?.includes(lessonId) || false;
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    persistProfile(formData);
    setStep(1);
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await invokeTutorFunction<{ lacunas?: any[] }>('tutor-diagnostico', { ...formData, userKey });
      setDiagnosis(data.lacunas || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar diagnóstico.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    setError(null);
    try {
      const { data } = await invokeTutorFunction<{ plano?: any[] }>('tutor-plano', {
        perfil: formData,
        lacunas: diagnosis,
        userKey,
      });
      const generatedPlan = data.plano || [];
      setStudyPlan(generatedPlan);
      setStep(2);
      if (generatedPlan.length > 0) {
        setModoData(prev => ({ ...prev, topico: generatedPlan[0].titulo }));
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar plano.');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleGenerateSession = async (manualMinutos?: string, manualTopico?: string) => {
    const mins = manualMinutos || modoData.minutos;
    const top = manualTopico || modoData.topico;
    if (!mins || !top) return;
    setIsGeneratingSession(true);
    try {
      const { data } = await invokeTutorFunction('tutor-tempo', {
        minutos: parseInt(mins),
        topico: top,
        perfil: formData,
        userKey,
      });
      setQuickSession(data);
    } finally {
      setIsGeneratingSession(false);
    }
  };

  const handleAskDuvida = async (e: React.FormEvent) => {
    e.preventDefault();
    await askQuestion(duvida);
  };

  const handleToggleVoice = () => {
    setIsVoiceActive(prev => {
      const newState = !prev;
      if (!newState && audioRef.current) {
        audioRef.current.pause();
        setCurrentlyPlayingId(null);
      }
      toast.info(newState ? "Voz do Tutor ativada" : "Voz do Tutor desativada");
      return newState;
    });
  };

  const handleStartRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        toast.error("Seu celular não suporta gravação por voz neste navegador.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        try {
          const { data } = await invokeTutorFunction<{ text?: string }>('tutor-whisper', formData);
          if (data.text) {
            setDuvida(data.text);
            await askQuestion(data.text);
          }
        } catch (err) {
          toast.error("Não consegui entender — tente digitar.");
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      toast.error("Erro ao acessar microfone.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleListenResponse = async (index: number, text: string) => {
    if (currentlyPlayingId === index) {
      audioRef.current?.pause();
      setCurrentlyPlayingId(null);
      return;
    }

    setIsPreparingAudio(index);
    try {
      const url = await generateAudio(text);
      if (!url) throw new Error("Falha ao gerar áudio");

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(url);
      audioRef.current = audio;
      setCurrentlyPlayingId(index);
      
      audio.onended = () => {
        setCurrentlyPlayingId(null);
      };

      await audio.play();
    } catch (err) {
      toast.error("Áudio indisponível no momento");
    } finally {
      setIsPreparingAudio(null);
    }
  };

  const handleSearchCourses = async (query?: string, courseId?: number, autoOpen = false, context?: any) => {
    let q = query ?? searchQuery;
    setIsLoading(true);
    if (!autoOpen && !courseId) setStep(5);
    try {
      const { data } = await invokeTutorFunction<{ data?: any[] }>('cefis-courses', {
        id: courseId,
        search: q,
        userKey,
      });
      const results = data.data || [];
      setCourses(results);
      if (courseId && results.length > 0) {
        setSelectedCourse(results[0]);
        setNavigationContext(context || { source: 'catalogo' });
        setPreviousStep(step);
        setStep(6);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderNavigation = () => {
    if (step < 0) return null;
    const navItems = [
      { id: 0, label: "Início", icon: Home },
      { id: 1, label: "Diagnóstico", icon: ClipboardCheck },
      { id: 2, label: "Plano", icon: LayoutDashboard },
      { id: 3, label: "Sessão Rápida", icon: Zap },
      { id: 4, label: "Dúvidas", icon: MessageCircle },
      { id: 5, label: "Catálogo", icon: Library },
    ];
    return (
      <nav className="w-full mb-8 bg-card/50 backdrop-blur-sm p-1.5 rounded-2xl border border-border sticky top-4 z-[100] overflow-hidden">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5 sm:justify-center sm:flex-wrap md:gap-4 scroll-smooth">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setPreviousStep(step); setStep(item.id); }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 shrink-0 whitespace-nowrap",
                step === item.id ? "bg-accent text-primary-foreground shadow-md shadow-accent/20" : "text-secondary hover:bg-accent/10 hover:text-accent"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className={cn(
                "sm:inline",
                step === item.id ? "inline" : "hidden"
              )}>{item.label}</span>
            </button>
          ))}
          <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all shrink-0 whitespace-nowrap ml-auto sm:ml-0">
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </nav>
    );

  };

  const renderContent = () => {
    if (step === -2) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
    
    if (step === -1) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <Card className="w-full max-w-md border-border shadow-2xl overflow-hidden bg-card/80 backdrop-blur-sm">
            <div className="h-1.5 bg-accent w-full" />
            <CardHeader className="text-center pt-10 pb-6">
              <div className="relative inline-block">
                <div className="absolute -inset-4 bg-accent/20 blur-2xl rounded-full opacity-50" />
                <CefisLogo className="w-56 mx-auto text-primary relative z-10" />
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-secondary">Email</Label>
                  <Input id="email" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="seu@email.com" required className="h-12 bg-muted/20 border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pass" className="text-secondary">Senha</Label>
                  <div className="relative">
                    <Input 
                      id="pass" 
                      type={showPassword ? "text" : "password"} 
                      value={loginPass} 
                      onChange={e => setLoginPass(e.target.value)} 
                      placeholder="••••••••" 
                      required 
                      className="h-12 bg-muted/20 border-border pr-10" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary/60 hover:text-accent transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                {error && <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg">{error}</div>}
                <Button type="submit" disabled={isLoggingIn} className="w-full h-12 bg-accent hover:bg-accent/90 text-primary-foreground font-bold text-lg mt-4 shadow-lg shadow-accent/10">
                  {isLoggingIn ? <><Loader2 className="animate-spin mr-2" /> Conectando...</> : "Conectar Conta CEFIS"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="pb-8 text-center justify-center">
              <p className="text-[10px] text-secondary/60">Acesso via API oficial da CEFIS</p>
            </CardFooter>
          </Card>
        </div>
      );
    }

    switch (step) {
      case 0:
        return (
          <Card className="max-w-2xl mx-auto border-border shadow-sm overflow-hidden">
             <div className="bg-accent/10 p-4 border-b border-accent/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <Badge className="bg-accent text-primary-foreground border-none gap-1 font-black px-3 py-1 self-start whitespace-nowrap">
                ✓ PERFIL CEFIS CONECTADO
              </Badge>
              <span className="text-xs text-secondary font-medium italic truncate">Logado como {formData.nome}</span>
            </div>
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl font-serif break-words leading-tight">Bem-vindo ao seu Tutor IA</CardTitle>
              <CardDescription>Vamos alinhar seu objetivo para criar um plano de estudos sob medida.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOnboardingSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Seu Nome</Label>
                    <Input value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} placeholder="Como quer ser chamado?" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Nível de Conhecimento</Label>
                    <Select value={formData.nivel} onValueChange={val => setFormData({...formData, nivel: val})}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="iniciante">Iniciante</SelectItem>
                        <SelectItem value="intermediário">Intermediário</SelectItem>
                        <SelectItem value="avançado">Avançado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Como você aprende melhor?</Label>
                  <Select value={formData.estiloAprendizagem} onValueChange={val => setFormData({...formData, estiloAprendizagem: val})}>
                    <SelectTrigger><SelectValue placeholder="Selecione seu estilo..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exemplos práticos">Com exemplos práticos e casos reais</SelectItem>
                      <SelectItem value="explicação teórica">Com explicação teórica primeiro</SelectItem>
                      <SelectItem value="direto ao ponto">Direto ao ponto, de forma objetiva</SelectItem>
                      <SelectItem value="analogias">Com analogias e comparações</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>O que você deseja aprender agora? (Objetivo)</Label>
                  <Input value={formData.objetivo} onChange={e => setFormData({...formData, objetivo: e.target.value})} placeholder="Ex: Dominar o IRPF 2024, entender auditoria contábil..." required />
                </div>
                <div className="space-y-2">
                  <Label>Sua experiência profissional</Label>
                  <Input value={formData.experiencia} onChange={e => setFormData({...formData, experiencia: e.target.value})} placeholder="Ex: Analista Fiscal há 3 anos" required />
                </div>
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-primary-foreground font-bold h-12">Começar Diagnóstico</Button>
              </form>
            </CardContent>
          </Card>
        );
      case 1:
        return (
          <Card className="max-w-2xl mx-auto border-border shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 space-y-0">
              <div className="space-y-1.5 min-w-0">
                <CardTitle className="text-xl sm:text-2xl font-serif break-words">Diagnóstico de Aprendizado</CardTitle>
                <CardDescription className="break-words">Análise baseada no seu objetivo: {formData.objetivo}</CardDescription>
              </div>
              {!isLoading && diagnosis.length > 0 && (
                <Button 
                  onClick={handleGeneratePlan} 
                  disabled={isGeneratingPlan} 
                  size="sm"
                  className="w-full sm:w-auto shrink-0 bg-accent hover:bg-accent/90 text-primary-foreground font-bold shadow-lg shadow-accent/20"
                >
                  {isGeneratingPlan ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : "Gerar Plano de Estudos"}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex flex-col items-center py-12">
                  <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
                  <h3 className="text-xl font-bold">Analisando lacunas...</h3>
                  <p className="text-secondary mt-2">O Tutor está consultando o catálogo da CEFIS para você.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {diagnosis.map((gap, i) => (
                    <Card key={i} className="border-border/50 bg-muted/20">
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-accent">{gap.topico}</h4>
                          <Badge variant="outline" className="capitalize">{gap.prioridade}</Badge>
                        </div>
                        <p className="text-sm text-secondary">{gap.por_que_importa}</p>
                        {gap.curso_cefis_relacionado && (
                           <div className="text-xs bg-card p-2 rounded border border-border flex items-center justify-between">
                            <span className="font-bold text-accent">Curso Relacionado:</span> {gap.curso_cefis_relacionado}
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-accent" onClick={() => handleSearchCourses(gap.curso_cefis_relacionado)}>Explorar</Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  <Button onClick={handleGeneratePlan} disabled={isGeneratingPlan} className="w-full bg-accent mt-4">
                    {isGeneratingPlan ? <Loader2 className="animate-spin mr-2" /> : "Gerar Meu Plano de Estudos"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      case 2:
        return (
          <Card className="max-w-2xl mx-auto border-border shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-xl sm:text-2xl font-serif">Seu Plano de Estudos</CardTitle>
                <CardDescription>Rota recomendada para atingir seu objetivo.</CardDescription>
              </div>
              {!isGeneratingPlan && studyPlan.length > 0 && (
                <Button 
                  onClick={() => {
                    const firstCourse = studyPlan.find(item => item.curso_id);
                    if (firstCourse) {
                      handleSearchCourses(undefined, firstCourse.curso_id, false, { source: 'plano', trail: studyPlan });
                    }
                  }}
                  className="w-full sm:w-auto shrink-0 bg-accent hover:bg-accent/90 text-primary-foreground font-bold shadow-lg shadow-accent/20 animate-pulse"
                >
                  <PlayCircle className="w-4 h-4 mr-2" /> Iniciar Trilha
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isGeneratingPlan ? (
                <div className="flex flex-col items-center py-12"><Loader2 className="animate-spin w-12 h-12 text-accent mb-4" /><h3>Montando plano...</h3></div>
              ) : (
                <div className="space-y-6">
                  {studyPlan.map((item, i) => {
                    const lessons = completedLessons[item.curso_id] || [];
                    
                    return (
                      <div key={i} className="relative pl-8 before:absolute before:left-3 before:top-2 before:bottom-0 before:w-0.5 before:bg-muted last:before:hidden">
                        <div className={cn(
                          "absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors z-[1]",
                          lessons.length > 0 ? "bg-[#b3e51d] text-[#051124]" : "bg-accent text-white"
                        )}>
                          {lessons.length > 0 ? "✓" : i+1}
                        </div>
                        <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4">
                            <h4 className="font-bold flex items-center gap-2 min-w-0 break-words">
                              <span className="break-words">{item.titulo}</span>
                              {lessons.length > 0 && <CheckCircle2 className="w-4 h-4 text-[#b3e51d] shrink-0" />}
                            </h4>
                            <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0 flex-wrap w-full sm:w-auto">
                              <div className="flex items-center gap-2">
                                {item.origem === 'catalogo_cefis' ? (
                                  <Badge className="bg-accent text-primary-foreground font-bold">CEFIS</Badge>
                                ) : (
                                  <TutorAiLogo showText={false} className="scale-90" />
                                )}
                              </div>
                              <Button 
                                size="sm"
                                onClick={() => {
                                  if (item.curso_id) {
                                    handleSearchCourses(undefined, item.curso_id, false);
                                  } else {
                                    setSelectedAiContent({
                                      titulo: item.titulo,
                                      conteudo: item.conteudo || item.descricao
                                    });
                                    setPreviousStep(2);
                                    setStep(7);
                                  }
                                }}
                                className={cn(
                                  "font-bold h-8 flex-1 sm:flex-none",
                                  item.curso_id 
                                    ? "bg-accent hover:bg-accent/90 text-primary-foreground" 
                                    : "bg-[#b3e51d] hover:bg-[#b3e51d]/90 text-[#051124]"
                                )}
                              >
                                <PlayCircle className="w-4 h-4 mr-1.5" /> 
                                {item.curso_id ? 'Iniciar Curso' : 'Iniciar'}
                              </Button>
                            </div>
                          </div>
                          <MarkdownRenderer content={item.descricao} className="text-secondary" />
                          <div className="flex items-center gap-1.5 pt-1">
                            <p className="text-[10px] text-muted-foreground italic">Informação gerada por: {item.origem === 'catalogo_cefis' ? 'Conteúdo Original CEFIS' : 'tutor.ai'}</p>
                          </div>
                          
                          {item.curso_id && lessons.length > 0 && (
                            <div className="pt-1 space-y-1">
                              <div className="flex justify-between text-[10px] font-medium text-secondary">
                                <span>Seu progresso</span>
                                <span>{lessons.length} aulas assistidas</span>
                              </div>
                              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-[#b3e51d]" style={{ width: `${Math.min(100, (lessons.length / 8) * 100)}%` }} />
                              </div>
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-2 border-t border-border/30 text-xs text-secondary">
                            <span><Clock className="inline w-3 h-3 mr-1" />{item.tempo_estimado_min} min</span>
                            {item.curso_id ? <Button variant="link" className="h-auto p-0 text-accent font-bold" onClick={() => handleSearchCourses(undefined, item.curso_id, false, { source: 'plano', trail: studyPlan })}>Ver o curso</Button> : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex gap-2">
                    <Button onClick={() => setStep(3)} className="flex-1 bg-accent">Sessão Rápida</Button>
                    <Button onClick={() => setStep(4)} variant="outline" className="flex-1">Dúvidas</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      case 3:
        return (
          <Card className="max-w-2xl mx-auto border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-serif">Sessão de Estudo Rápida</CardTitle>
              <CardDescription>Quanto tempo você tem agora?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Minutos disponíveis</Label>
                  <Select 
                    value={modoData.minutos} 
                    onValueChange={val => setModoData({...modoData, minutos: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tempo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 minutos</SelectItem>
                      <SelectItem value="20">20 minutos</SelectItem>
                      <SelectItem value="30">30 minutos</SelectItem>
                      <SelectItem value="60">60 minutos</SelectItem>
                      <SelectItem value="90">90 minutos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tópico de interesse</Label>
                  {studyPlan.length > 0 ? (
                    <Select 
                      value={modoData.topico} 
                      onValueChange={val => setModoData({...modoData, topico: val})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um tópico do seu plano..." />
                      </SelectTrigger>
                      <SelectContent>
                        {studyPlan.map((item, idx) => (
                          <SelectItem key={idx} value={item.titulo}>{item.titulo}</SelectItem>
                        ))}
                        <SelectItem value="outro">-- Outro tópico --</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={modoData.topico} onChange={e => setModoData({...modoData, topico: e.target.value})} placeholder="Ex: ICMS" />
                  )}
                  {studyPlan.length > 0 && modoData.topico === "outro" && (
                    <Input 
                      className="mt-2"
                      placeholder="Digite o tópico desejado..." 
                      onChange={e => setModoData({...modoData, topico: e.target.value})} 
                    />
                  )}
                </div>
              </div>
              <Button onClick={() => handleGenerateSession()} disabled={isGeneratingSession} className="w-full bg-accent h-12">
                {isGeneratingSession ? <Loader2 className="animate-spin mr-2" /> : "Gerar Sessão Personalizada"}
              </Button>

              {quickSession && (
                <div className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">Sua trilha para hoje ({quickSession.total_min} min):</h3>
                    <Button 
                      size="sm"
                      onClick={() => {
                        const firstCourse = quickSession.itens.find((item: any) => item.curso_id);
                        if (firstCourse) {
                          handleSearchCourses(undefined, firstCourse.curso_id, false, { source: 'sessao', trail: quickSession.itens });
                        }
                      }}
                      className="bg-accent hover:bg-accent/90 text-primary-foreground font-bold"
                    >
                      <PlayCircle className="w-4 h-4 mr-2" /> Iniciar Sessão
                    </Button>
                  </div>
                  {quickSession.itens.map((item: any, i: number) => (
                    <div key={i} className="p-4 rounded-xl border border-border bg-muted/10 space-y-2">
                      <div className="flex justify-between font-bold text-accent">
                        <span>{item.titulo}</span>
                        <span className="text-xs">{item.tempo_min} min</span>
                      </div>
                      <p className="text-sm text-secondary">{item.resumo}</p>
                      <div className="flex items-center gap-1.5 pt-1">
                        <p className="text-[10px] text-muted-foreground italic">Informação gerada por:</p>
                        {item.curso_id ? (
                          <CefisLogo className="w-12 text-primary" />
                        ) : (
                          <TutorAiLogo className="scale-75 origin-left" />
                        )}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-[10px] font-bold" 
                        onClick={() => {
                          if (item.curso_id) {
                            handleSearchCourses(undefined, item.curso_id, false);
                          } else {
                            setSelectedAiContent({
                              titulo: item.titulo,
                              conteudo: item.conteudo || item.resumo
                            });
                            setPreviousStep(3);
                            setStep(7);
                          }
                        }}
                      >
                        {item.curso_id ? 'Iniciar Curso' : 'Iniciar'}
                      </Button>
                    </div>
                  ))}
                  
                  {quickSession.itens.some((item: any) => !item.curso_id) && (
                    <div className="mt-6 p-4 rounded-xl border border-dashed border-accent/50 bg-accent/5">
                      <p className="text-sm text-center text-secondary mb-3">
                        💡 Se você adicionar mais alguns minutos de estudo, você pode fazer uma trilha completa com cursos em vídeo!
                      </p>
                      <Button 
                        variant="outline" 
                        className="w-full border-accent text-accent hover:bg-accent hover:text-white font-bold transition-all"
                        onClick={() => {
                          const firstCourse = studyPlan.find(item => item.curso_id);
                          if (firstCourse) {
                            handleSearchCourses(undefined, firstCourse.curso_id, false, { source: 'plano', trail: studyPlan });
                          } else {
                            setStep(1);
                          }
                        }}
                      >
                        <PlayCircle className="w-4 h-4 mr-2" /> Sugerir Trilha Completa
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      case 4:
        return (
          <Card className="max-w-3xl mx-auto border-border shadow-sm flex flex-col h-[600px]">
            <CardHeader className="border-b">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 font-serif"><MessageCircle className="text-accent" /> Chat com o Tutor</CardTitle>
                  <CardDescription>Tire dúvidas técnicas baseadas no catálogo real da CEFIS.</CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={isVoiceActive ? "default" : "outline"}
                  onClick={handleToggleVoice}
                  className={cn(
                    "h-8 gap-2 font-bold transition-all shrink-0",
                    isVoiceActive ? "bg-accent text-primary-foreground shadow-lg shadow-accent/20" : "text-secondary border-dashed"
                  )}
                >
                  <Sparkles className={cn("w-3 h-3", isVoiceActive && "animate-pulse")} />
                  {isVoiceActive ? "Voz Ativa" : "Ativar Voz"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.length === 0 && <div className="text-center py-20 text-secondary italic">Como posso te ajudar hoje? Pergunte algo sobre contabilidade ou impostos.</div>}
              {chatHistory.map((chat, i) => (
                <div key={i} className="space-y-4">
                  <div className="flex justify-end"><div className="bg-accent text-primary-foreground p-3 rounded-2xl rounded-tr-none max-w-[80%] text-sm">{chat.pergunta}</div></div>
                  <div className="flex justify-start">
                    <div className="bg-muted p-4 rounded-2xl rounded-tl-none max-w-[90%] space-y-3 relative group">
                      <MarkdownRenderer 
                        content={chat.resposta} 
                        courseName={chat.fonte?.curso}
                        courseId={chat.fonte?.curso_id}
                        onCourseClick={(id, title) => handleSearchCourses(undefined, id, false)}
                        isTyping={chat.isNew}
                      />
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                        {chat.fonte ? (
                          <div className="text-[10px] text-secondary flex items-center gap-2">
                             <span>Fonte: {chat.fonte.curso} - {chat.fonte.aula}</span>
                             {chat.fonte.curso_id && <Button variant="link" className="h-auto p-0 text-[10px] text-accent font-bold" onClick={() => handleSearchCourses(undefined, chat.fonte?.curso_id)}>Acessar Conteúdo</Button>}
                           </div>
                        ) : null}
                        
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleListenResponse(i, chat.resposta)}
                          className={cn(
                            "h-7 text-[10px] gap-1 px-2 font-bold transition-all",
                            currentlyPlayingId === i ? "text-accent bg-accent/10" : "text-secondary hover:text-accent"
                          )}
                        >
                          {isPreparingAudio === i ? (
                            <><Loader2 className="w-3 h-3 animate-spin" /> Preparando...</>
                          ) : currentlyPlayingId === i ? (
                            <><Pause className="w-3 h-3" /> Pausar</>
                          ) : (
                            <><Volume2 className="w-3 h-3 text-[#b3e51d]" /> Ouvir resposta</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(isAsking || isPreparingAudio !== null) && (
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-2xl rounded-tl-none flex items-center gap-3 shadow-sm">
                    <div className="flex items-center gap-1.5 px-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-[bounce_1s_infinite_0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-[bounce_1s_infinite_200ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-[bounce_1s_infinite_400ms]" />
                    </div>
                    <span className="text-xs font-medium text-secondary">
                      {isAsking
                        ? (isVoiceActive ? "Tutor está preparando voz..." : "Tutor está digitando...")
                        : "Preparando áudio..."}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
            {isVoiceActive && (
              <div className="px-4 py-2 border-t bg-muted/10 flex items-center justify-end">
                <span className="text-[10px] text-accent font-bold animate-pulse flex items-center gap-1">
                  <div className="flex gap-0.5 items-end h-3">
                    <div className="w-0.5 h-1 bg-accent animate-[bounce_1s_infinite_0ms]" />
                    <div className="w-0.5 h-2 bg-accent animate-[bounce_1s_infinite_200ms]" />
                    <div className="w-0.5 h-3 bg-accent animate-[bounce_1s_infinite_400ms]" />
                  </div>
                  Voz ativa — respostas serão faladas automaticamente
                </span>
              </div>
            )}
            <form onSubmit={handleAskDuvida} className="p-4 border-t bg-card flex gap-2 items-center">
              <Button 
                type="button"
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={cn(
                  "h-12 w-12 shrink-0 rounded-xl transition-all duration-300",
                  isRecording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-muted/50 hover:bg-muted text-secondary hover:text-accent"
                )}
                disabled={isAsking}
              >
                {isRecording ? <div className="flex items-center gap-1 font-bold text-[10px]"><div className="w-2 h-2 bg-white rounded-full animate-ping" /> <Square className="w-3 h-3 fill-white" /></div> : <Mic className="w-5 h-5" />}
              </Button>
              <Input 
                placeholder={isRecording ? "Gravando..." : "Sua dúvida..."} 
                value={duvida} 
                onChange={e => setDuvida(e.target.value)} 
                disabled={isAsking || isRecording} 
                className="h-12 border-none bg-muted/30" 
              />
              <Button type="submit" disabled={isAsking || isRecording || !duvida.trim()} size="icon" className="h-12 w-12 bg-accent shrink-0 rounded-xl">
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </Card>
        );
      case 5:
        return (
          <div className="space-y-6">
            <Card className="max-w-4xl mx-auto border-border shadow-sm overflow-hidden">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2 font-serif"><Search className="text-accent" /> Explorar Catálogo</CardTitle>
                <CardDescription>Busque por cursos reais da plataforma CEFIS.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={e => { e.preventDefault(); handleSearchCourses(); }} className="flex gap-2">
                  <Input placeholder="Contabilidade, Impostos..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-12" />
                  <Button type="submit" disabled={isLoading} className="h-12 bg-accent">{isLoading ? <Loader2 className="animate-spin" /> : <Search />}</Button>
                </form>
                {(() => {
                  const stop = new Set(["de","da","do","das","dos","e","a","o","as","os","em","para","com","sobre","um","uma","no","na","nos","nas","por","ao","aos"]);
                  const base = (formData.objetivo || "").toLowerCase();
                  const tokens = base.split(/[^a-záàâãéêíóôõúüç0-9]+/i).filter(t => t.length > 2 && !stop.has(t));
                  const tags = Array.from(new Set([formData.objetivo, ...tokens].filter(Boolean))).slice(0, 8) as string[];
                  if (!tags.length) return null;
                  return (
                    <div className="pt-1">
                      <p className="text-xs text-secondary mb-2">Sugestões baseadas no seu objetivo:</p>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((t, i) => (
                          <Badge key={i} onClick={() => { setSearchQuery(t); handleSearchCourses(t); }} className="cursor-pointer bg-accent/10 text-accent border border-accent/30 hover:bg-accent hover:text-white transition-colors capitalize">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.map(course => (
                <Card key={course.id} className="border-border hover:shadow-md transition-all group">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-lg group-hover:text-accent transition-colors">{course.title}</h4>
                      {course.averageRating && <Badge className="bg-yellow-50 text-yellow-600 border-yellow-200">{course.averageRating} ★</Badge>}
                    </div>
                    <CardDescription className="line-clamp-1 italic">{course.subtitle}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-secondary line-clamp-3">{course.summary || 'Sem resumo.'}</p>
                    <div className="flex items-center justify-between pt-4 border-t">
                      <span className="text-xs text-secondary"><Clock className="inline w-3 h-3 mr-1" />{Math.floor(course.duration / 3600)}h</span>
                      <Button variant="outline" size="sm" className="bg-accent text-white border-none" onClick={() => { setSelectedCourse(course); setNavigationContext({ source: 'catalogo' }); setStep(6); }}>Ver Detalhes</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      case 6:
        return (
          <CourseDetails 
            course={selectedCourse}
            context={navigationContext}
            onNavigate={(id, title, ctx) => handleSearchCourses(title, id, true, ctx)}
            userProfile={formData}
            onBack={() => setStep(previousStep)}
            onQuestion={t => { setDuvida(`Sobre o curso: ${t}\n`); setStep(4); }}
            onCompleteLesson={handleCompleteLesson}
            isLessonCompleted={isLessonCompleted}
            userKey={userKey}
          />
        );
      case 7:
        if (!selectedAiContent) return null;
        return (
          <div className="space-y-6">
            <Button variant="ghost" onClick={() => setStep(previousStep)} className="mb-2 text-secondary hover:text-accent">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para {previousStep === 2 ? 'meu plano' : 'sessão rápida'}
            </Button>
            <Card className="max-w-4xl mx-auto border-border shadow-xl overflow-hidden bg-card/50 backdrop-blur-md">
              <CardHeader className="bg-accent/5 border-b border-border/50 pb-8">
                <div className="flex justify-between items-center mb-6">
                  <Badge className="bg-accent text-primary-foreground font-bold px-3 py-1">Conteúdo do Tutor</Badge>
                  <TutorAiLogo showText={false} className="scale-125" />
                </div>
                <CardTitle className="text-3xl sm:text-4xl font-serif font-bold text-foreground leading-tight">
                  {selectedAiContent.titulo}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 sm:p-12">
                <div className="prose prose-slate max-w-none">
                  <MarkdownRenderer 
                    content={selectedAiContent.conteudo} 
                    className="text-lg leading-relaxed text-secondary space-y-6" 
                  />
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t border-border/50 flex flex-col sm:flex-row justify-between gap-4 p-8">
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto border-accent text-accent hover:bg-accent/5 font-bold h-12 px-6 rounded-xl"
                  onClick={() => { 
                    setDuvida(`Sobre o conteúdo "${selectedAiContent.titulo}": `); 
                    setStep(4); 
                  }}
                >
                  <MessageCircle className="w-5 h-5 mr-2" /> Tirar dúvida com o Tutor
                </Button>
                <Button 
                  className="w-full sm:w-auto bg-[#b3e51d] text-[#051124] hover:bg-[#b3e51d]/90 font-bold h-12 px-8 rounded-xl shadow-lg shadow-[#b3e51d]/20 transition-all hover:scale-105" 
                  onClick={() => setStep(previousStep)}
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" /> Concluir e Voltar
                </Button>
              </CardFooter>
            </Card>
          </div>
        );
      default: return null;
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground pb-20">
      <Toaster position="top-center" richColors />
      <div className="max-w-4xl mx-auto px-4">
        {step >= 0 && (
          <header className="py-8 flex flex-col items-center">
            <div className="mb-6 flex flex-col items-center cursor-pointer group" onClick={() => setStep(0)}>
              <div className="flex flex-col items-center">
                <h1 className="text-4xl sm:text-5xl font-serif font-black tracking-tighter text-accent transition-transform group-hover:scale-105 drop-shadow-[0_0_15px_rgba(179,229,29,0.2)]">
                  TUTOR<span className="text-foreground/50">.</span>IA
                </h1>
                <div className="flex items-center gap-3 mt-2 opacity-60 group-hover:opacity-100 transition-opacity">
                  <div className="h-[1px] w-8 bg-secondary/20" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary">Powered by</span>
                  <CefisLogo className="h-3 text-secondary" />
                  <div className="h-[1px] w-8 bg-secondary/20" />
                </div>
              </div>
            </div>
            {renderNavigation()}
          </header>
        )}
        <div className={cn("transition-all duration-300", step === -1 ? "pt-0" : "pt-0")}>
          {renderContent()}
        </div>
      </div>
    </main>
  );
}
