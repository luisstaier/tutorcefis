import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Clock, BookOpen, User, Search, Loader2, Star, PlayCircle, MessageCircle, Send, Home, ClipboardCheck, LayoutDashboard, Zap, Library, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { Toaster, toast } from "sonner";
import CourseDetails from "./CourseDetails";


const MarkdownRenderer = ({ content, className = "" }: { content: string; className?: string }) => (
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
        a: ({node, ...props}) => <a className="text-accent underline hover:text-accent/80 transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);
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
  const [step, setStep] = useState(0); // 0: Início, 1: Diagnóstico, 2: Plano, 3: Sessão Rápida, 4: Dúvidas, 5: Catálogo, 6: Detalhes
  const [previousStep, setPreviousStep] = useState(0);
  const [formData, setFormData] = useState({
    nome: "",
    objetivo: "",
    experiencia: "",
    nivel: "",
  });

  const [modoData, setModoData] = useState({
    minutos: "",
    topico: "",
  });
  
  const [searchQuery, setSearchQuery] = useState("");
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [completedLessons, setCompletedLessons] = useState<Record<number, number[]>>({}); // courseId -> lessonIds[]
  const [diagnosis, setDiagnosis] = useState<any[]>([]);
  const [studyPlan, setStudyPlan] = useState<any[]>([]);
  const [quickSession, setQuickSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isGeneratingSession, setIsGeneratingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duvida, setDuvida] = useState("");
  const [chatHistory, setChatHistory] = useState<{
    pergunta: string;
    resposta: string;
    fonte?: { curso: string; aula: string; curso_id?: number };
  }[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  

  useEffect(() => {
    const savedProfile = localStorage.getItem("tutor_cefs_profile");
    if (savedProfile) {
      setFormData(JSON.parse(savedProfile));
    }

    const savedProgress = localStorage.getItem("tutor_cefis_progress");
    if (savedProgress) {
      setCompletedLessons(JSON.parse(savedProgress));
    }
  }, []);

  const handleCompleteLesson = (courseId: number, lessonId: number) => {
    setCompletedLessons(prev => {
      const courseLessons = prev[courseId] || [];
      if (courseLessons.includes(lessonId)) return prev;
      
      const newProgress = {
        ...prev,
        [courseId]: [...courseLessons, lessonId]
      };
      localStorage.setItem("tutor_cefis_progress", JSON.stringify(newProgress));
      toast.success("Aula marcada como concluída!");
      return newProgress;
    });
  };

  const isLessonCompleted = (courseId: number, lessonId: number) => {
    return completedLessons[courseId]?.includes(lessonId) || false;
  };


  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("tutor_cefs_profile", JSON.stringify(formData));
    
    setStep(1); // Mudar para tela de diagnóstico
    
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: functionError } = await supabase.functions.invoke('tutor-diagnostico', {
        body: formData
      });

      if (functionError) throw functionError;
      setDiagnosis(data.lacunas || []);
    } catch (err: any) {
      console.error('Diagnosis error:', err);
      setError(err.message || 'Erro ao gerar diagnóstico.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    setError(null);
    try {
      const { data, error: functionError } = await supabase.functions.invoke('tutor-plano', {
        body: {
          perfil: formData,
          lacunas: diagnosis
        }
      });

      if (functionError) throw functionError;
      setStudyPlan(data.plano || []);
      
      setStep(2); // Mudar para tela de plano
      
      // Preparar dados para o modal de Sessão Rápida
      if (data.plano && data.plano.length > 0) {
        setModoData(prev => ({
          ...prev,
          topico: data.plano[0].titulo
        }));
        
      }
    } catch (err: any) {

      console.error('Plan generation error:', err);
      setError(err.message || 'Erro ao gerar plano de estudos.');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleGenerateSession = async (manualMinutos?: string, manualTopico?: string) => {
    const mins = manualMinutos || modoData.minutos;
    const top = manualTopico || modoData.topico;
    
    if (!mins || !top) return;
    
    setIsGeneratingSession(true);
    setError(null);
    try {
      const { data, error: functionError } = await supabase.functions.invoke('tutor-tempo', {
        body: {
          minutos: parseInt(mins),
          topico: top,
          perfil: formData
        }
      });


      if (functionError) throw functionError;
      setQuickSession(data);
      
    } catch (err: any) {

      console.error('Session generation error:', err);
      setError(err.message || 'Erro ao gerar sessão rápida.');
    } finally {
      setIsGeneratingSession(false);
    }
  };

  const handleAskDuvida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!duvida.trim()) return;

    const perguntaAtual = duvida;
    setDuvida("");
    setIsAsking(true);
    setError(null);
    
    try {
      // 1. Tentar primeiro tutor-transcricao
      const { data: transData, error: transError } = await supabase.functions.invoke('tutor-transcricao', {
        body: {
          pergunta: perguntaAtual,
          perfil: formData
        }
      });

      // Se falhar ou não tiver transcrição, tenta tutor-duvidas
      if (transError || !transData || transData.error) {
        console.log("Fallback para tutor-duvidas (transcrição indisponível)");
        const { data: duvData, error: duvError } = await supabase.functions.invoke('tutor-duvidas', {
          body: {
            pergunta: perguntaAtual,
            perfil: formData
          }
        });

        if (duvError) throw duvError;
        
        setChatHistory(prev => [...prev, {
          pergunta: perguntaAtual,
          resposta: duvData.resposta || "Desculpe, não consegui processar sua dúvida.",
          fonte: duvData.curso_id ? {
            curso: duvData.curso_titulo || "Curso relacionado",
            aula: "Geral",
            curso_id: duvData.curso_id
          } : undefined
        }]);
      } else {
        // Sucesso com transcrição
        setChatHistory(prev => [...prev, {
          pergunta: perguntaAtual,
          resposta: transData.resposta,
          fonte: transData.fonte
        }]);
      }
      
    } catch (err: any) {

      console.error('Duvida error:', err);
      setError(err.message || 'Erro ao enviar dúvida.');
    } finally {
      setIsAsking(false);
    }
  };

  const handleSearchCourses = async (query?: string, courseId?: number, autoOpen = false) => {
    let q = query ?? searchQuery;
    if (query) setSearchQuery(query);
    
    setIsLoading(true);
    setError(null);
    
    // Only change step if not auto-opening (which is used for background fetch)
    if (!autoOpen && !courseId) setStep(5);
    
    try {
      const { data, error: functionError } = await supabase.functions.invoke('cefis-courses', {
        body: courseId ? { id: courseId } : { search: q }
      });


      if (functionError) throw functionError;
      
      let finalCourses = data.data || [];
      
      // Retry logic if no results and we have a query (and not searching by ID)
      if (finalCourses.length === 0 && q && !courseId) {
        // Fallback 1: Try first 3 significant words
        const keywords3 = q.split(' ')
          .filter(word => word.length > 3) 
          .slice(0, 3)
          .join(' ');
          
        if (keywords3 && keywords3 !== q) {
          const { data: retryData, error: retryError } = await supabase.functions.invoke('cefis-courses', {
            body: { search: keywords3 }
          });
          if (!retryError && retryData.data && retryData.data.length > 0) {
            finalCourses = retryData.data;
            setSearchQuery(keywords3);
          }
        }

        // Fallback 2: If still empty, try just the first 2 significant words
        if (finalCourses.length === 0) {
          const keywords2 = q.split(' ')
            .filter(word => word.length > 3)
            .slice(0, 2)
            .join(' ');
            
          if (keywords2 && keywords2 !== keywords3) {
            const { data: retryData, error: retryError } = await supabase.functions.invoke('cefis-courses', {
              body: { search: keywords2 }
            });
            if (!retryError && retryData.data && retryData.data.length > 0) {
              finalCourses = retryData.data;
              setSearchQuery(keywords2);
            }
          }
        }
      }

      if (courseId && finalCourses.length > 0) {
        setSelectedCourse(finalCourses[0]);
        setPreviousStep(step);
        setStep(6);
      } else if (autoOpen && finalCourses.length > 0) {
        setSelectedCourse(finalCourses[0]);
        setPreviousStep(step);
        setStep(6);
      } else {
        setCourses(finalCourses);
        if (!autoOpen) setStep(5);
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Erro ao carregar cursos.');
    } finally {
      setIsLoading(false);
    }
  };


  const navItems = [
    { id: 0, label: "Início", icon: Home },
    { id: 1, label: "Diagnóstico", icon: ClipboardCheck },
    { id: 2, label: "Plano", icon: LayoutDashboard },
    { id: 3, label: "Sessão Rápida", icon: Zap },
    { id: 4, label: "Dúvidas", icon: MessageCircle },
    { id: 5, label: "Explorar Catálogo", icon: Library },
  ];

  const renderNavigation = () => {
    return (
      <nav className="flex flex-wrap justify-center gap-1 md:gap-4 mb-8 bg-card/50 backdrop-blur-sm p-2 rounded-2xl border border-border sticky top-4 z-50">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === 5 && courses.length === 0) {
                handleSearchCourses(searchQuery);
              } else {
                setPreviousStep(step);
                setStep(item.id);
              }
            }}

            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
              step === item.id 
                ? "bg-accent text-primary-foreground shadow-md shadow-accent/20" 
                : "text-secondary hover:bg-accent/10 hover:text-accent"
            )}

          >
            <item.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        ))}
      </nav>
    );
  };

  const renderContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="max-w-4xl mx-auto space-y-6">
            <Card className="max-w-md mx-auto border-border shadow-sm overflow-hidden">
              <div className="h-2 bg-accent w-full" />
              <CardHeader>
                <CardTitle className="text-3xl font-bold">Bem-vindo ao Tutor CEFIS</CardTitle>
                <CardDescription className="text-secondary text-lg">
                  Vamos personalizar sua jornada de aprendizado para que você alcance seus objetivos mais rápido.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleOnboardingSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome completo</Label>
                    <Input 
                      id="nome" 
                      value={formData.nome} 
                      onChange={e => setFormData({...formData, nome: e.target.value})} 
                      required 
                      placeholder="Como prefere ser chamado?"
                      className="focus-visible:ring-accent"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="objetivo">Objetivo de aprendizado</Label>
                    <Input 
                      id="objetivo" 
                      value={formData.objetivo} 
                      onChange={e => setFormData({...formData, objetivo: e.target.value})} 
                      required 
                      placeholder="O que você quer dominar?"
                      className="focus-visible:ring-accent"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="experiencia">Experiência profissional</Label>
                    <Input 
                      id="experiencia" 
                      value={formData.experiencia} 
                      onChange={e => setFormData({...formData, experiencia: e.target.value})} 
                      required 
                      placeholder="Área de atuação e cargo"
                      className="focus-visible:ring-accent"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nivel">Nível de conhecimento</Label>
                    <Select 
                      value={formData.nivel} 
                      onValueChange={val => setFormData({...formData, nivel: val})} 
                      required
                    >
                      <SelectTrigger className="focus:ring-accent">
                        <SelectValue placeholder="Selecione seu nível" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="iniciante">Iniciante</SelectItem>
                        <SelectItem value="intermediário">Intermediário</SelectItem>
                        <SelectItem value="avançado">Avançado</SelectItem>
                        <SelectItem value="embed_test">TESTE DE EMBED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.nivel === "embed_test" && (
                    <div className="p-4 border border-accent rounded-lg bg-accent/5 space-y-4">
                      <h3 className="font-bold">Teste de Embed CEFIS</h3>
                      <p className="text-xs break-all text-secondary">URL: https://cdn2.cefis.com.br/vod/09fc72a6-f97b-4cff-8d23-e91cd279aacb/360.mp4</p>
                      <video 
                        controls 
                        className="w-full rounded border border-border"
                        onPlay={() => console.log("Video playing: https://cdn2.cefis.com.br/vod/09fc72a6-f97b-4cff-8d23-e91cd279aacb/360.mp4")}
                        onError={(e) => console.error("Video error:", e)}
                      >
                        <source src="https://cdn2.cefis.com.br/vod/09fc72a6-f97b-4cff-8d23-e91cd279aacb/360.mp4" type="video/mp4" />
                        Seu navegador não suporta vídeos.
                      </video>
                    </div>
                  )}
                  <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-primary-foreground font-bold h-12 text-lg shadow-lg shadow-accent/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    Começar Jornada
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="max-w-2xl mx-auto">
              <Card 
                className="border-accent/20 bg-accent/5 hover:bg-accent/10 transition-colors cursor-pointer"
                onClick={() => handleSearchCourses("")}
              >

                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-card rounded-xl flex items-center justify-center shadow-sm text-accent">
                    <Library className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-accent">Explorar todo o catálogo da CEFIS</h3>
                    <p className="text-sm text-secondary">Acesse milhares de cursos reais e certificados.</p>
                  </div>
                  <Search className="text-accent w-5 h-5 opacity-50" />
                </CardContent>
              </Card>
            </div>
          </div>
        );
      case 1:
        return (
          <Card className="max-w-2xl mx-auto border-border shadow-sm text-center py-8">
            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="flex flex-col items-center py-12">
                  <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
                  <h2 className="text-2xl font-bold">Analisando seu perfil...</h2>
                  <p className="text-secondary mt-2">
                    Identificando lacunas de aprendizado com base no catálogo da CEFIS.
                  </p>
                </div>
              ) : error ? (
                <div className="space-y-4">
                  <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
                    {error}
                  </div>
                  <Button onClick={() => setStep(0)} variant="outline">Tentar novamente</Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="text-success w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold">Diagnóstico Concluído!</h2>
                  <p className="text-secondary">Encontramos algumas áreas-chave para focar sua evolução.</p>
                  
                  <div className="space-y-4 text-left">
                    {diagnosis.length > 0 ? (
                      diagnosis.map((gap, i) => (
                        <Card key={i} className="border-border hover:border-accent/30 transition-colors">
                          <CardContent className="pt-6 space-y-3">
                            <div className="flex justify-between items-start gap-4">
                              <h4 className="font-bold text-lg leading-tight">{gap.topico}</h4>
                              <Badge 
                                className={`${
                                  gap.prioridade === 'alta' ? 'bg-accent hover:bg-accent' : 
                                  gap.prioridade === 'media' ? 'bg-secondary hover:bg-secondary' : 
                                  'bg-success hover:bg-success'
                                } text-primary-foreground border-none`}
                              >
                                {gap.prioridade.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="text-sm text-secondary">
                              <MarkdownRenderer content={gap.por_que_importa} />
                            </div>
                            {gap.curso_cefis_relacionado && (
                              <div className="text-xs bg-muted/30 p-2 rounded border border-border flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="bg-white/90 p-1 rounded">
                                    <CefisLogo className="w-10 text-[#051124]" />
                                  </div>

                                  <span className="font-bold text-accent">Curso:</span> {gap.curso_cefis_relacionado}
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 text-[10px] text-accent hover:bg-accent/5 font-bold gap-1"
                                  onClick={() => handleSearchCourses(gap.curso_cefis_relacionado)}
                                >
                                  <Search className="w-2.5 h-2.5" /> Explorar
                                </Button>
                              </div>
                            )}


                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8 text-secondary italic">
                        Não foi possível gerar um diagnóstico automático. Tente novamente ou explore o catálogo.
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                    {studyPlan.length > 0 ? (
                      <Button 
                        onClick={() => setStep(2)} 
                        variant="outline" 
                        className="border-accent text-accent hover:bg-accent/5 font-bold"
                      >
                        Voltar ao Plano
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleGeneratePlan} 
                        disabled={isGeneratingPlan}
                        className="bg-accent hover:bg-accent/90 text-primary-foreground font-bold"
                      >
                        {isGeneratingPlan ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Montando plano...
                          </>
                        ) : (
                          "Gerar Meu Plano Completo"
                        )}
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      onClick={() => setStep(4)}
                      className="border-accent text-accent hover:bg-accent/5 font-bold"
                    >
                      Tirar uma dúvida
                    </Button>
                  </div>
                  <Button variant="ghost" onClick={() => setStep(0)} className="text-secondary text-xs">Recomeçar diagnóstico</Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      case 2:
        return (
          <Card className="max-w-2xl mx-auto border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Seu Plano de Estudos Personalizado</CardTitle>
              <CardDescription className="text-lg">Estrutura recomendada para {formData.objetivo || "seu objetivo"}.</CardDescription>
            </CardHeader>
            <CardContent>
              {isGeneratingPlan ? (
                <div className="flex flex-col items-center py-12">
                  <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
                  <h3 className="text-xl font-bold">Montando seu plano...</h3>
                  <p className="text-secondary mt-2 text-center">Cruzando o catálogo da CEFIS com seu perfil para criar a melhor rota.</p>
                </div>
              ) : studyPlan.length > 0 ? (
                <div className="space-y-6">
                  <div className="relative pl-8 space-y-8 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-muted">
                    {studyPlan.map((stepItem, i) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-10 top-0 w-8 h-8 flex items-center justify-center z-10">
                          <div className="w-2 h-2 rounded-full bg-accent/40" />
                        </div>
                        <div className={cn(
                          "p-4 rounded-lg border border-border space-y-3 transition-colors",
                          stepItem.origem === 'catalogo_cefis' ? "bg-card hover:bg-muted/30" : "bg-muted/30"
                        )}>
                          <div className="flex justify-between items-start gap-4">
                            <h4 className="font-bold text-lg leading-tight flex items-center gap-2">
                              {stepItem.titulo}
                              {stepItem.curso_id && completedLessons[stepItem.curso_id]?.length > 0 && (
                                <CheckCircle2 className="w-4 h-4 text-[#b3e51d]" />
                              )}
                            </h4>
                            <Badge 
                              className={`${
                                stepItem.origem === 'catalogo_cefis' ? 'bg-success hover:bg-success' : 'bg-accent hover:bg-accent'
                              } text-primary-foreground border-none shrink-0`}
                            >
                              {stepItem.origem === 'catalogo_cefis' ? (
                                <span className="flex items-center gap-1 bg-white/90 px-1 py-0.5 rounded">
                                  <CefisLogo className="w-12 text-[#051124]" />
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">✨ Tutor</span>
                              )}


                            </Badge>
                          </div>
                          <div className="text-sm text-secondary">
                            <MarkdownRenderer content={stepItem.descricao} />
                          </div>
                          
                          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border/50">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1 text-xs text-secondary font-medium">
                                <Clock className="w-3 h-3" /> {stepItem.tempo_estimado_min} min
                              </div>
                              {stepItem.fonte && (
                                <div className="text-xs text-secondary font-medium italic truncate max-w-[250px]">
                                  Fonte: {stepItem.fonte}
                                </div>
                              )}
                            </div>
                            {stepItem.origem === 'catalogo_cefis' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 text-[10px] text-accent hover:text-accent hover:bg-accent/5 font-bold gap-1"
                                onClick={() => {
                                  handleSearchCourses(stepItem.fonte || stepItem.titulo, stepItem.curso_id, true);
                                }}
                              >
                                <Search className="w-3 h-3" /> Explorar este curso
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    <Button onClick={() => setStep(3)} className="bg-accent hover:bg-accent/90 text-primary-foreground font-bold">Ir para Sessão Rápida</Button>
                    <Button variant="outline" onClick={() => setStep(4)} className="border-accent text-accent hover:bg-accent/5 font-bold">Tirar Dúvida Agora</Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="p-4 bg-muted/50 rounded-lg border border-dashed border-border mb-6">
                    <p className="text-secondary italic">Nenhum plano gerado ainda.</p>
                  </div>
                  <Button onClick={handleGeneratePlan} className="bg-accent text-primary-foreground">Gerar Plano de Estudos</Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      case 3:
        return (
          <Card className="max-w-2xl mx-auto border-border shadow-sm overflow-hidden min-h-[400px]">
            <div className="h-2 bg-accent w-full" />
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Zap className="text-accent" /> Sessão Rápida Personalizada
              </CardTitle>
              <CardDescription>Conteúdo otimizado com IA baseado no seu tempo disponível.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="pt-6">
                {isGeneratingSession ? (
                  <div className="flex flex-col items-center py-12">
                    <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
                    <p className="text-lg font-medium">Otimizando conteúdo para {modoData.minutos} minutos...</p>
                    <p className="text-sm text-secondary">Selecionando o melhor do catálogo CEFIS para você.</p>
                  </div>
                ) : error ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm mb-4">
                      {error}
                    </div>
                    <Button onClick={() => setQuickSession(null)} className="bg-accent text-primary-foreground font-bold">Tentar Novamente</Button>
                  </div>
                ) : quickSession?.itens && Array.isArray(quickSession.itens) && quickSession.itens.length > 0 ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <h3 className="font-bold text-xl">{modoData.topico}</h3>
                        <p className="text-xs text-secondary">Sua micro-trilha exclusiva</p>
                      </div>
                      <Badge className="bg-accent/10 text-accent border-none">{quickSession?.total_min ?? 0} min total</Badge>
                    </div>
                    <div className="space-y-4">
                      {quickSession.itens.map((item: any, i: number) => (
                        <Card key={i} className="border-border hover:border-accent/30 transition-all">

                          <CardContent className="pt-6 space-y-3">
                            <div className="flex justify-between items-start gap-4">
                              <h4 className="font-bold text-lg leading-tight">{item?.titulo ?? "Sem título"}</h4>
                              <Badge variant="secondary" className="bg-muted text-secondary shrink-0">
                                {item?.tempo_min ?? 0} min
                              </Badge>
                            </div>
                            <div className="text-sm text-secondary">
                              <MarkdownRenderer content={item?.resumo ?? ""} />
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-border/50">
                              <Badge 
                                className={`${
                                  item?.origem === 'catalogo_cefis' ? 'bg-success hover:bg-success' : 'bg-accent hover:bg-accent'
                                } text-primary-foreground border-none`}
                              >
                                {item?.origem === 'catalogo_cefis' ? (
                                  <div className="bg-white/90 px-1 py-0.5 rounded">
                                    <CefisLogo className="w-12 text-[#051124]" />
                                  </div>
                                ) : '✨ Tutor'}

                              </Badge>
                              <div className="flex items-center gap-4 overflow-hidden">
                                {item?.fonte && (
                                  <span className="text-xs text-secondary italic truncate max-w-[150px]">
                                    {item.fonte}
                                  </span>
                                )}
                                {item?.origem === 'catalogo_cefis' && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 text-[10px] text-accent hover:text-accent hover:bg-accent/5 font-bold gap-1 px-1"
                                    onClick={() => handleSearchCourses(item.fonte || item.titulo, item.curso_id)}
                                  >
                                    <Search className="w-2 h-2" /> Ver no catálogo
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-border">
                  <Button onClick={() => setStep(2)} variant="outline" className="border-accent text-accent hover:bg-accent/5 font-bold">Voltar ao Plano</Button>
                  <Button onClick={() => setQuickSession(null)} className="bg-accent hover:bg-accent/90 text-primary-foreground font-bold">Nova Sessão Rápida</Button>
                </div>

                  </div>
                ) : (
                  <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-secondary">Tópico para revisar</Label>
                        <Select 
                          value={modoData.topico} 
                          onValueChange={(v) => setModoData(prev => ({ ...prev, topico: v }))}
                        >
                          <SelectTrigger className="focus:ring-accent bg-muted/30 border-border h-12">
                            <SelectValue placeholder="Selecione um tópico" />
                          </SelectTrigger>
                          <SelectContent>
                            {studyPlan.length > 0 ? (
                              studyPlan.map((item: any, i: number) => (
                                <SelectItem key={i} value={item.titulo}>
                                  {item.titulo}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="Geral">Assunto Geral</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-xs uppercase tracking-wider text-secondary">Quanto tempo você tem?</Label>
                        <div className="flex flex-wrap gap-2">
                          {["5", "10", "30", "45", "60", "90"].map((m) => (
                            <Button 
                              key={m} 
                              variant={modoData.minutos === m ? "default" : "outline"}
                              onClick={() => setModoData(prev => ({ ...prev, minutos: m }))}
                              className={cn(
                                "h-11 px-6 font-bold transition-all",
                                modoData.minutos === m ? "bg-accent text-primary-foreground scale-105 shadow-md shadow-accent/20" : "border-border text-secondary hover:border-accent/50"
                              )}
                            >
                              {m} min
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col gap-3">
                      <Button 
                        onClick={() => handleGenerateSession()}
                        disabled={!modoData.topico || !modoData.minutos || isGeneratingSession}
                        className="h-14 bg-accent hover:bg-accent/90 text-primary-foreground font-bold text-lg shadow-lg shadow-accent/20"
                      >
                        Começar Aula com IA
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={() => setStep(2)}
                        className="text-secondary font-medium"
                      >
                        Voltar ao Plano Completo
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      case 4:
        return (
          <Card className="max-w-2xl mx-auto border-border shadow-sm flex flex-col h-[650px] overflow-hidden">
            <div className="h-2 bg-accent w-full" />
            <CardHeader className="bg-card/80 backdrop-blur-sm z-10 border-b border-border">
              <CardTitle className="text-2xl flex items-center gap-2">
                <MessageCircle className="text-accent" /> Tire suas dúvidas
              </CardTitle>
              <CardDescription>Pergunte sobre impostos, contabilidade ou sua carreira profissional.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden p-0">
              <div className="flex-1 overflow-y-auto space-y-6 p-4 md:p-6 bg-muted/5">
                {chatHistory.length === 0 && !isAsking && (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-12">
                    <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center">
                      <MessageCircle className="text-accent w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">Olá! Sou seu Tutor CEFIS.</h4>
                      <p className="text-secondary max-w-sm">Mande sua primeira dúvida para começarmos a conversar!</p>
                    </div>
                  </div>
                )}
                {chatHistory.map((chat, i) => (
                  <div key={i} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-end">
                      <div className="bg-accent text-primary-foreground p-4 rounded-2xl rounded-tr-none max-w-[85%] text-sm shadow-md shadow-accent/10">
                        {chat.pergunta}
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-card p-5 rounded-2xl rounded-tl-none max-w-[90%] text-sm border border-border shadow-sm space-y-3">
                        {chat.fonte && (
                          <Badge variant="outline" className="mb-2 bg-primary/10 text-primary border-primary/20 flex items-center gap-2 w-fit text-[10px] py-1 px-2 h-7">
                            <div className="bg-white/90 px-1 py-0.5 rounded">
                              <CefisLogo className="w-10 text-[#051124]" />
                            </div>

                            <span className="text-foreground/80 font-medium">Baseado na aula: {chat.fonte.aula} — curso {chat.fonte.curso}</span>
                          </Badge>
                        )}

                        <MarkdownRenderer content={chat.resposta} />
                        <div className="pt-2 flex justify-end">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-[10px] h-7 border-accent/20 text-accent hover:bg-accent/5 gap-1 font-bold"
                            onClick={() => {
                              handleSearchCourses(chat.fonte?.curso || chat.pergunta, chat.fonte?.curso_id, true);
                            }}
                          >
                            <Library className="w-3 h-3" /> {chat.fonte ? "Explorar este curso" : "Explorar cursos relacionados"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {isAsking && (
                  <div className="flex justify-start animate-pulse">
                    <div className="bg-card p-4 rounded-2xl rounded-tl-none border border-border flex items-center gap-3 shadow-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-accent" />
                      <span className="text-sm text-secondary font-medium">Tutor está consultando o catálogo...</span>
                    </div>
                  </div>
                )}
              </div>
              
              <form onSubmit={handleAskDuvida} className="p-4 bg-card border-t border-border flex gap-2">
                <Input 
                  placeholder="Ex: Como funciona a tributação do Simples Nacional?" 
                  value={duvida}
                  onChange={e => setDuvida(e.target.value)}
                  disabled={isAsking}
                  className="flex-1 h-12 focus-visible:ring-accent bg-muted/30 border-none"
                />
                <Button type="submit" disabled={isAsking || !duvida.trim()} size="icon" className="h-12 w-12 bg-accent hover:bg-accent/90 text-primary-foreground shrink-0 rounded-xl shadow-lg shadow-accent/20">
                  <Send className="w-5 h-5" />
                </Button>
              </form>
            </CardContent>
          </Card>
        );
      case 5:
        return (
          <div className="space-y-6">
            <Card className="max-w-4xl mx-auto border-border shadow-sm overflow-hidden">
              <div className="h-2 bg-accent w-full" />
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2 font-serif">
                  <Search className="text-accent" /> Explorar Catálogo da CEFIS
                </CardTitle>
                <CardDescription className="text-lg">
                  Busque por cursos reais diretamente na plataforma CEFIS para aprofundar seu conhecimento.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); handleSearchCourses(); }} className="flex flex-col sm:flex-row gap-2">
                  <Input 
                    placeholder="Contabilidade, Impostos, Auditoria, Carreira..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 h-12 focus-visible:ring-accent"
                  />
                  <Button type="submit" disabled={isLoading} className="h-12 px-8 bg-accent hover:bg-accent/90 text-primary-foreground font-bold shadow-lg shadow-accent/20">
                    {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                    Buscar Cursos
                  </Button>
                </form>
              </CardContent>
            </Card>

            {error && (
              <div className="max-w-4xl mx-auto p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg">
                {error}
              </div>
            )}

            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.map((course) => (
                <Card key={course.id} className={cn(
                  "border-border shadow-sm hover:shadow-md transition-all hover:border-accent/20 group",
                  courses.length === 1 && "border-accent ring-1 ring-accent/20"
                )}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="bg-white/90 px-1 py-0.5 rounded">
                            <CefisLogo className="w-14 text-[#051124]" />
                          </div>

                          {courses.length === 1 && (
                            <Badge className="bg-accent text-primary-foreground border-none text-[10px] h-5">CURSO ENCONTRADO</Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg font-bold leading-tight group-hover:text-accent transition-colors">{course.title}</CardTitle>
                      </div>

                      {course.averageRating && (
                        <div className="flex items-center text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-xs font-bold shrink-0">
                          <Star className="w-3 h-3 fill-current mr-1" />
                          {course.averageRating}
                        </div>
                      )}
                    </div>
                    <CardDescription className="text-sm italic line-clamp-1">{course.subtitle}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-secondary line-clamp-3">{course.summary || 'Sem resumo disponível.'}</p>
                    
                    <div className="flex flex-wrap gap-2">
                      {course.categories?.slice(0, 3).map((cat: any) => (
                        <Badge key={cat.id} variant="secondary" className="bg-muted/50 text-[10px] px-2 py-0.5 rounded-full">
                          {cat.name}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div className="flex items-center gap-3 text-xs text-white/80 font-medium">
                        <span className="flex items-center gap-1 bg-[#132442] px-2 py-1 rounded-md border border-white/10">
                          <Clock className="w-3 h-3 text-primary" /> {Math.floor(course.duration / 3600)}h {Math.floor((course.duration % 3600) / 60)}min
                        </span>
                        <span className="flex items-center gap-1 bg-[#132442] px-2 py-1 rounded-md border border-white/10">
                          <PlayCircle className="w-3 h-3 text-primary" /> {course.lessonCount} aulas
                        </span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-primary hover:bg-primary/90 text-primary-foreground border-none font-bold shadow-sm"
                        onClick={() => {
                          console.log("Abrindo curso:", course.id, course.title);
                          setSelectedCourse(course);
                          setPreviousStep(step);
                          setStep(6);
                        }}
                      >
                        Ver detalhes
                      </Button>

                    </div>
                  </CardContent>
                </Card>
              ))}

              {!isLoading && courses.length === 0 && !error && (
                <div className="col-span-full py-20 text-center space-y-4">
                  <Library className="mx-auto w-16 h-16 text-muted-foreground/30" />
                  <p className="text-secondary italic text-lg">
                    Use a barra acima para pesquisar milhares de cursos reais da CEFIS.
                  </p>
                </div>
              )}
            </div>
            
            <div className="max-w-4xl mx-auto flex justify-center pb-8">
              <Button variant="outline" className="text-secondary border-border" onClick={() => setStep(0)}>Voltar ao Início</Button>
            </div>
          </div>
        );
      case 6:
        return (
          <CourseDetails 
            course={selectedCourse} 
            userProfile={formData}
            onBack={() => setStep(previousStep)}
            onQuestion={(title: string) => {
              setDuvida(`Tenho uma dúvida sobre o curso: ${title}\n`);
              setStep(4);
            }}
            onCompleteLesson={handleCompleteLesson}
            isLessonCompleted={isLessonCompleted}
          />
        );
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen pb-12 bg-background text-foreground transition-colors duration-500">
      <Toaster position="top-center" richColors />
      



      <div className="max-w-4xl mx-auto px-4">
        <header className="py-8 flex flex-col items-center">
          <div className="mb-6 flex flex-col items-center cursor-pointer group" onClick={() => setStep(0)}>
            <div className="flex flex-col items-center gap-4 mb-1 transition-transform duration-300 group-hover:scale-105">
              <CefisLogo className="w-48 sm:w-64 text-primary" />
              <div className="px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">TUTOR IA</span>
              </div>
            </div>
            <p className="text-secondary font-medium italic mt-2">Seu aprendizado, no seu tempo.</p>
          </div>

          
          {renderNavigation()}
        </header>
        
        <div className="transition-all duration-300">
          {renderContent()}
        </div>
        
        <footer className="mt-20 text-center border-t border-border pt-8 text-white/40 text-xs">
          © 2026 Tutor CEFIS - Inteligência Artificial integrada ao melhor conteúdo contábil.
        </footer>

      </div>
    </main>
  );
}

