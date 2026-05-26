import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, PlayCircle, Star, ArrowLeft, Loader2, MessageCircle, CheckCircle2, Menu, X, ChevronLeft, ChevronRight, GraduationCap, BookOpen, Sparkles, Target, Award, Book, Dumbbell, FileText, Check, XCircle, Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TutorAiLogo } from "./TutorAiLogo";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";


interface CourseDetailsProps {
  course: any;
  context?: { source: string; trail?: any[] } | null;
  onNavigate?: (courseId: number, courseTitle: string, context: any) => void;
  onBack: () => void;
  userProfile: any;
  onQuestion: (courseTitle: string) => void;
  onCompleteLesson: (courseId: number, lessonId: number) => void;
  isLessonCompleted: (courseId: number, lessonId: number) => boolean;
  userKey?: string;
}

export default function CourseDetails({ 
  course, 
  context,
  onNavigate,
  onBack, 
  userProfile, 
  onQuestion, 
  onCompleteLesson,
  isLessonCompleted,
  userKey
}: CourseDetailsProps) {
  console.log("CourseDetail montou com courseId:", course?.id);
  const [lesson, setLesson] = useState<any>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [lessonsGallery, setLessonsGallery] = useState<any[]>([]);
  const [isLoadingLesson, setIsLoadingLesson] = useState(true);
  const [isSwitchingLesson, setIsSwitchingLesson] = useState(false);
  const [quiz, setQuiz] = useState<any>(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<any[]>([]);
  const [isQuizFinished, setIsQuizFinished] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isCertificateLoading, setIsCertificateLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const quizTimerRef = useRef<any>(null);
  const inactivityTimerRef = useRef<any>(null);
  const [motivationalMessage, setMotivationalMessage] = useState<string | null>(null);
  const [isMotivationalLoading, setIsMotivationalLoading] = useState(false);
  const [showMotivational, setShowMotivational] = useState(false);
  const [triggeredMilestones, setTriggeredMilestones] = useState<number[]>([]);
  const [lastActivity, setLastActivity] = useState(Date.now());


  // Calcula progresso do curso
  const totalLessons = lessonsGallery.length || course?.lessonCount || 0;
  const completedCount = lessonsGallery.filter(l => isLessonCompleted(course?.id, l.id)).length;
  const courseProgressPercent = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;
  const isCourseCompleted = courseProgressPercent >= 80;

  const normalizedGoals = Array.isArray(course?.goals)
    ? course.goals
        .map((goal: unknown) => (typeof goal === "string" ? goal : String(goal ?? "")))
        .filter((goal: string) => goal.trim())
    : typeof course?.goals === "string"
      ? course.goals.split("\n").filter((goal: string) => goal.trim())
      : [];
  const preferredStreamSource = currentVideoUrl;

  // Carregar aula inicial somente quando o curso muda
  useEffect(() => {
    console.log("CourseDetails montado com courseId:", course?.id);
    if (!course?.id) {
      console.error("CourseDetails: course.id is missing");
      return;
    }
    fetchLesson();
  }, [course?.id]);

  // Listeners do vídeo
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !lesson?.id) return;

    const handleEnded = () => {
      console.log("Vídeo finalizado, marcando conclusão:", lesson.id);
      onCompleteLesson(course.id, lesson.id);
    };

    const handleTimeUpdate = () => {
      if (video.duration) {
        const progress = (video.currentTime / video.duration) * 100;
        setVideoProgress(progress);

        // Gatilhos de 25%, 50%, 75%
        const milestones = [25, 50, 75];
        milestones.forEach(milestone => {
          if (progress >= milestone && progress < milestone + 1 && !triggeredMilestones.includes(milestone)) {
            setTriggeredMilestones(prev => [...prev, milestone]);
            fetchMotivationalMessage(`O aluno atingiu ${milestone}% da aula.`);
          }
        });

        // Se atingir 80% e ainda não estiver completa
        if (progress >= 80 && !isLessonCompleted(course.id, lesson.id)) {
          console.log("Atingiu 80% do vídeo, marcando como concluída automaticamente.");
          onCompleteLesson(course.id, lesson.id);
        }
      }
      setLastActivity(Date.now());
    };

    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [lesson?.id, course?.id, completedCount]); // completedCount para forçar re-check de conclusão

  useEffect(() => {
    return () => {
      if (quizTimerRef.current) clearTimeout(quizTimerRef.current);
    };
  }, []);

  useEffect(() => {
    // Forçar recarga da tag video quando a aula muda
    if (lesson?.id && videoRef.current) {
      videoRef.current.load();
    }
  }, [lesson?.id]);

  const fetchMotivationalMessage = async (context: string) => {
    setIsMotivationalLoading(true);
    setShowMotivational(true);
    try {
      const { data, error } = await supabase.functions.invoke('tutor-duvidas', {
        body: { 
          pergunta: `Gere uma mensagem motivacional estoica personalizada curta (máximo 2 parágrafos). Contexto: ${context}. O aluno está estudando o curso "${course?.title}" e a aula "${lesson?.title}".`, 
          perfil: userProfile, 
          userKey 
        }
      });
      if (error) throw error;
      setMotivationalMessage(data?.resposta || "Mantenha o foco. A disciplina é a ponte entre metas e conquistas.");
    } catch (err) {
      console.error("Erro ao buscar mensagem motivacional:", err);
      setMotivationalMessage("A persistência é o caminho do êxito.");
    } finally {
      setIsMotivationalLoading(false);
    }
  };

  // Timer de inatividade (10 minutos)
  useEffect(() => {
    const checkInactivity = () => {
      const now = Date.now();
      if (now - lastActivity > 10 * 60 * 1000 && !showMotivational) {
        fetchMotivationalMessage("O aluno está inativo há 10 minutos.");
      }
    };

    const interval = setInterval(checkInactivity, 60000); // Checa a cada minuto
    return () => clearInterval(interval);
  }, [lastActivity, showMotivational]);


    setIsCertificateLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cefis-proxy', {
        body: { 
          method: 'GET',
          path: '/performance/certificates',
          userKey
        }
      });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Se existir certificado, abre o primeiro (simplificado)
        const cert = data[0];
        window.open(cert.file_url || 'https://cefis.com.br', '_blank');
      } else {
        toast.info("Complete a avaliação final no site da CEFIS para emitir seu certificado.");
        window.open('https://cefis.com.br', '_blank');
      }
    } catch (err) {
      console.error("Erro ao buscar certificado:", err);
      toast.error("Não foi possível carregar seu certificado. Tente pelo site da CEFIS.");
    } finally {
      setIsCertificateLoading(false);
    }
  };

  const fetchLesson = async (selectedLessonId?: number) => {
    if (!course?.id) return;

    // Se já temos a galeria E a aula tem videoUrl, troca localmente
    if (selectedLessonId && lessonsGallery.length > 0) {
      const foundLesson = lessonsGallery.find(l => l.id === selectedLessonId);
      if (foundLesson && foundLesson.videoUrl) {
        setIsSwitchingLesson(true);
        setShowQuiz(false);
        setQuiz(null);
        setQuizAnswers([]);
        setCurrentQuestionIndex(0);
        setIsQuizFinished(false);
        setQuizError(null);

        setLesson(foundLesson);
        setCurrentVideoUrl(foundLesson.videoUrl);
        setIsSwitchingLesson(false);
        return;
      }
    }

    if (selectedLessonId) {
      setIsSwitchingLesson(true);
      setShowQuiz(false);
      setQuiz(null);
      setQuizAnswers([]);
      setCurrentQuestionIndex(0);
      setIsQuizFinished(false);
      setQuizError(null);
    } else {
      setIsLoadingLesson(true);
    }

    setHasError(false);
    try {
      const { data, error } = await supabase.functions.invoke('cefis-lesson', {
        body: { courseId: course.id, lessonId: selectedLessonId, userKey }
      });
      if (error) throw error;

      const current = data?.current || data;
      setLesson(current);
      setCurrentVideoUrl(current?.videoUrl || null);
      if (data?.lessons) {
        // Mescla videoUrls novos no gallery existente (preservando o que já tinha)
        setLessonsGallery(prev => {
          if (prev.length === 0) return data.lessons;
          return prev.map(p => {
            const updated = data.lessons.find((nl: any) => nl.id === p.id);
            return updated && updated.videoUrl ? { ...p, ...updated } : p;
          });
        });
      }
    } catch (err) {
      console.error("Error fetching lesson:", err);
      setHasError(true);
    } finally {
      setIsLoadingLesson(false);
      setIsSwitchingLesson(false);
    }
  };

  const handleStartQuiz = async (lessonId: number | undefined | null) => {
    const finalLessonId = lessonId || lesson?.id;
    console.log("lessonId para quiz:", finalLessonId);
    
    if (!finalLessonId) {
      console.error("No lessonId available for quiz");
      setQuizError("Aula não identificada para gerar o quiz.");
      return;
    }

    if (isLoadingQuiz || quiz) {
      setShowQuiz(true);
      return;
    }
    
    setIsLoadingQuiz(true);
    setQuizError(null);
    try {
      const { data, error } = await supabase.functions.invoke('tutor-quiz', {
        body: { 
          lessonId: finalLessonId, 
          courseTitle: course?.title || "Curso",
          lessonTitle: lesson?.title || "",
          courseSummary: course?.summary || "",
          courseGoals: normalizedGoals,
          nivel: userProfile?.nivel || "Iniciante",
          estiloAprendizagem: userProfile?.estiloAprendizagem,
          userKey 
        }
      });
      if (error) throw error;
      
      if (data?.fallback || !data?.questoes || data.questoes.length === 0) {
        setQuizError("Quiz não disponível para esta aula — tente outra aula do curso.");
        setQuiz(null);
      } else {
        setQuiz(data);
        setShowQuiz(true);
        // Scroll to quiz
        setTimeout(() => {
          document.getElementById('quiz-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      console.error("Error fetching quiz:", err);
      setQuizError("Erro ao gerar o quiz. Tente novamente.");
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const handleAnswer = (answer: string) => {
    const currentQuestion = quiz?.questoes?.[currentQuestionIndex];
    if (!currentQuestion) return;
    const isCorrect = answer === currentQuestion.correta;
    
    setQuizAnswers([...quizAnswers, { 
      questionIndex: currentQuestionIndex, 
      selected: answer, 
      isCorrect 
    }]);

    // O feedback imediato é mostrado no render
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < (quiz?.questoes?.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setIsQuizFinished(true);
    }
  };

  const renderQuiz = () => {
    if (isLoadingQuiz) {
      return (
        <div className="flex flex-col items-center py-12 bg-muted/20 rounded-2xl border border-dashed border-border animate-pulse">
          <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
          <p className="text-lg font-bold text-accent">Gerando quiz com base na aula...</p>
          <p className="text-sm text-secondary">Isso pode levar alguns segundos.</p>
        </div>
      );
    }

    if (quizError || quiz?.fallback) {
      return (
        <div className="p-8 bg-muted/50 rounded-2xl text-center space-y-4 border border-border">
          <p className="text-secondary font-medium">{quizError || "Quiz não disponível para esta aula — tente outra aula do curso."}</p>
          <div className="flex justify-center gap-4">
            <Button 
              variant="outline" 
              className="border-accent text-accent hover:bg-accent/5 font-bold"
              onClick={() => onQuestion(course?.title || "Curso")}
            >
              <MessageCircle className="w-4 h-4 mr-2" /> Tirar uma dúvida
            </Button>
            <Button 
              className="bg-accent hover:bg-accent/90 text-primary-foreground font-bold"
              onClick={() => handleStartQuiz(lesson?.id)}
            >
              Tentar novamente
            </Button>
          </div>
        </div>
      );
    }

    if (isQuizFinished) {
      const correctCount = (quizAnswers || []).filter(a => a.isCorrect).length;
      let message = "";
      if (correctCount === 4) message = "Excelente! Você dominou o conteúdo desta aula.";
      else if (correctCount === 3) message = "Muito bom! Você está no caminho certo.";
      else if (correctCount === 2) message = "Bom começo! Recomendamos rever a aula.";
      else message = "Continue praticando! O tutor pode te ajudar com as dúvidas.";

      return (
        <div className="p-6 bg-card border border-border rounded-xl space-y-6 text-center animate-in fade-in slide-in-from-bottom-4">
          <div className="space-y-2">
            <h3 className="text-3xl font-bold text-accent">{correctCount} de 4 questões</h3>
            <p className="text-lg font-medium">{message}</p>
          </div>
          <div className="grid gap-3 pt-4">
            <Button 
              className="bg-accent hover:bg-accent/90 text-primary-foreground font-bold"
              onClick={() => onCompleteLesson(course?.id, lesson?.id)}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> 
              {isLessonCompleted(course?.id, lesson?.id) ? "Aula Concluída" : "Marcar aula como concluída"}
            </Button>
            <Button 
              variant="outline" 
              className="border-accent text-accent hover:bg-accent/5 font-bold"
              onClick={() => onQuestion(course?.title || "Curso")}
            >
              <MessageCircle className="w-4 h-4 mr-2" /> Tirar uma dúvida sobre esta aula
            </Button>
          </div>
        </div>
      );
    }

    const currentQuestion = quiz?.questoes?.[currentQuestionIndex];
    if (!currentQuestion) return null;
    const currentAnswer = quizAnswers.find(a => a.questionIndex === currentQuestionIndex);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex justify-between items-center">
          <Badge variant="outline" className="text-[#b3e51d] border-[#b3e51d]/30">Questão {currentQuestionIndex + 1} de 4</Badge>
          <div className="text-xs text-secondary font-medium">Nível: {userProfile?.nivel || "Geral"}</div>
        </div>

        <h3 className="text-xl font-bold">{currentQuestion.pergunta}</h3>

        <div className="grid gap-3">
          {currentQuestion?.alternativas && Object.entries(currentQuestion.alternativas).map(([key, value]) => {
            const isSelected = currentAnswer?.selected === key;
            const isCorrect = key === currentQuestion.correta;
            const showFeedback = !!currentAnswer;

            return (
              <button
                key={key}
                disabled={showFeedback}
                onClick={() => handleAnswer(key)}
                className={cn(
                  "p-4 text-left rounded-xl border transition-all duration-200 text-sm font-medium",
                  !showFeedback && "border-border hover:border-accent hover:bg-accent/5",
                  showFeedback && isCorrect && "bg-green-500/10 border-green-500/50 text-green-700",
                  showFeedback && isSelected && !isCorrect && "bg-red-500/10 border-red-500/50 text-red-700",
                  showFeedback && !isSelected && !isCorrect && "opacity-50 border-border"
                )}
              >
                <span className="font-bold mr-2 uppercase">{key})</span> {value as string}
              </button>
            );
          })}
        </div>

        {currentAnswer && (
          <div className="p-4 bg-muted/30 rounded-xl space-y-2 animate-in zoom-in-95">
            <p className="text-sm">
              <span className={currentAnswer.isCorrect ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                {currentAnswer.isCorrect ? "Correto!" : `Incorreto. A resposta correta era ${currentQuestion.correta.toUpperCase()}.`}
              </span>
            </p>
            <p className="text-sm text-secondary leading-relaxed italic">
              {currentQuestion.explicacao}
            </p>
            <Button size="sm" onClick={nextQuestion} className="w-full mt-2 bg-accent hover:bg-accent/90 text-primary-foreground font-bold">
              {currentQuestionIndex < 3 ? "Próxima Questão" : "Ver Resultado"}
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderSidebar = () => {
    if (!context || context.source === 'catalogo') return null;

    const isPlano = context.source === 'plano';
    const trail = context.trail || [];

    return (
      <>
        {/* Mobile/Desktop Overlay Backdrop */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/20 z-30 backdrop-blur-[1px] transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        
        <aside className={cn(
          "fixed left-0 top-0 h-full bg-card/95 border-r border-border z-40 transition-all duration-300 overflow-y-auto shadow-xl backdrop-blur-md",
          isSidebarOpen ? "w-[200px] translate-x-0" : "w-0 -translate-x-full"
        )}>
          <div className="p-4 space-y-6 pt-24">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[9px] uppercase tracking-wider text-secondary flex items-center gap-2">
                {isPlano ? "Sua trilha de estudos" : "Sua sessão rápida"}
              </h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsSidebarOpen(false)}>
                <X className="w-3 h-3" />
              </Button>
            </div>

            <div className="space-y-1">
              {trail.map((item: any, i: number) => {
                const isPlanoItem = context.source === 'plano';
                const isTutorGenerated = item.origem === 'gerado_pelo_tutor';
                const itemTitle = item.titulo;
                
                const isCurrent = (course.id && item.curso_id === course.id) || 
                                 (course.title && (isPlanoItem ? item.fonte === course.title : item.titulo === course.title));
                
                const currentIndex = trail.findIndex((t: any) => 
                  (course.id && t.curso_id === course.id) || 
                  (course.title && (isPlanoItem ? t.fonte === course.title : t.titulo === course.title))
                );
                const isPast = currentIndex > i;
                
                if (isTutorGenerated) {
                  return (
                    <div key={i} className="w-full text-left p-2 rounded-lg bg-muted/20 border border-transparent">
                      <div className="flex gap-2 items-start">
                        <div className="mt-1 shrink-0">
                          <Sparkles className="w-3 h-3 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium leading-tight text-secondary">
                            {itemTitle}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    key={i}
                    onClick={() => {
                      onNavigate?.(item.curso_id, isPlanoItem ? item.fonte : item.titulo, context);
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full text-left p-2 rounded-lg transition-all group",
                      isCurrent ? "bg-accent/10 border border-accent/20" : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex gap-2 items-start">
                      <div className="mt-1 shrink-0">
                        {isCurrent ? (
                          <div className="w-3 h-3 rounded-full bg-[#b3e51d] shadow-[0_0_8px_rgba(179,229,29,0.5)]" />
                        ) : isPast ? (
                          <CheckCircle2 className="w-3 h-3 text-[#b3e51d]" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border-2 border-muted" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-[10px] font-bold leading-tight",
                          isCurrent ? "text-accent" : "text-foreground"
                        )}>
                          {itemTitle}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </>
    );
  };

  if (!course || !course.id) {
    return (
      <div className="p-8 text-center space-y-6 max-w-md mx-auto">
        <div className="bg-muted/30 p-8 rounded-3xl border border-border">
          <Loader2 className="w-10 h-10 text-accent animate-spin mx-auto mb-4" />
          <p className="text-secondary font-medium">Carregando informações do curso...</p>
        </div>
        <Button onClick={onBack} variant="ghost" className="text-secondary hover:text-accent font-medium">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="p-8 text-center space-y-6 max-w-md mx-auto">
        <div className="bg-red-50 border border-red-100 p-6 rounded-2xl">
          <h3 className="text-red-800 font-bold mb-2">Ops! Algo deu errado</h3>
          <p className="text-red-600 text-sm">Não conseguimos carregar os detalhes desta aula no momento. Por favor, tente novamente.</p>
        </div>
        <div className="flex gap-4 justify-center">
          <Button onClick={onBack} variant="ghost" className="text-secondary hover:text-accent font-medium">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <Button onClick={() => fetchLesson()} className="bg-accent hover:bg-accent/90 text-primary-foreground font-bold">
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {renderSidebar()}

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="flex items-center justify-between mb-2">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="text-secondary hover:text-foreground hover:bg-muted font-medium -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> 
            {context?.source === 'catalogo' ? 'Voltar ao Catálogo' : 'Voltar'}
          </Button>

          {context && context.source !== 'catalogo' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="border-accent/20 text-accent hover:bg-accent/5 h-8 gap-2 font-bold"
            >
              <Menu className="w-4 h-4" />
              <span className="hidden sm:inline">{isSidebarOpen ? 'Esconder Trilha' : 'Ver Trilha'}</span>
            </Button>
          )}
        </div>

      {/* BARRA DE PROGRESSO DO CURSO */}
      <section className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 shadow-sm">
        <div className="flex-1 w-full space-y-2">
          <div className="flex justify-between text-sm font-bold">
            <span className="text-foreground">Progresso do Curso</span>
            <span className="text-accent">{completedCount} de {totalLessons} aulas concluídas</span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#b3e51d] transition-all duration-500" 
              style={{ width: `${courseProgressPercent}%` }}
            />
          </div>
        </div>
        {isCourseCompleted && (
          <Badge className="bg-[#b3e51d] text-[#051124] border-none font-black px-3 py-1 animate-bounce">
            CURSO CONCLUÍDO!
          </Badge>
        )}
      </section>

      {/* CARD DE CERTIFICADO */}
      {isCourseCompleted && (
        <Card className="bg-gradient-to-br from-accent/20 to-accent/5 border-accent/30 shadow-lg overflow-hidden animate-in zoom-in-95 duration-500">
          <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
              <GraduationCap className="w-8 h-8 text-accent" />
            </div>
            <div className="flex-1 text-center md:text-left space-y-1">
              <h3 className="text-xl font-bold">Parabéns! Você concluiu o curso</h3>
              <p className="text-secondary text-sm">Você assistiu todas as aulas e está pronto para o próximo nível.</p>
            </div>
            <Button 
              onClick={handleViewCertificate}
              disabled={isCertificateLoading}
              className="bg-accent hover:bg-accent/90 text-primary-foreground font-bold px-8"
            >
              {isCertificateLoading ? <Loader2 className="animate-spin mr-2" /> : <><FileText className="w-4 h-4 mr-2" /> Ver meu certificado</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* SEÇÃO 1 — HEADER DO CURSO */}
      <section className="relative rounded-3xl overflow-hidden border border-border bg-card shadow-sm">
        <div className="h-48 sm:h-64 overflow-hidden relative">
          <img 
            src={course?.banner || "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=1000"} 
            alt={course?.title || "Banner do curso"}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <Badge className="bg-[#b3e51d] text-[#051124] hover:bg-[#b3e51d] border-none mb-3 font-bold">
              <BookOpen className="w-3 h-3 inline mr-1" /> Conteúdo CEFIS
            </Badge>
            <h1 className="text-2xl sm:text-4xl font-bold font-serif leading-tight">{course?.title || "Curso"}</h1>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                <img 
                  src={course?.teacher?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${course?.teacher?.name || 'CEFIS'}`} 
                  alt={course?.teacher?.name || "Professor"} 
                />
              </div>
              <div>
                <p className="text-xs text-secondary font-medium">Professor</p>
                <p className="text-sm font-bold">{course?.teacher?.name || "Especialista CEFIS"}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 py-2 px-4 bg-muted/30 rounded-2xl border border-border/50">
              <div className="flex items-center text-yellow-500 font-bold gap-1 text-sm border-r border-border pr-4">
                <Star className="w-4 h-4 fill-current" />
                {course?.averageRating || "4.8"}
              </div>
              <div className="flex items-center gap-1 text-sm text-secondary font-medium border-r border-border pr-4">
                <Clock className="w-4 h-4" /> 
                {course?.duration ? `${Math.floor(course.duration / 3600)}h ${Math.floor((course.duration % 3600) / 60)}min` : "--"}
              </div>
              <div className="flex items-center gap-1 text-sm text-secondary font-medium">
                <PlayCircle className="w-4 h-4" /> 
                {course?.lessonCount || "0"} aulas
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 pt-4 border-t border-border">
            <div className="md:col-span-2 space-y-4">
              <h2 className="text-xl font-bold">Sobre o curso</h2>
              <p className="text-secondary leading-relaxed">{course?.summary || "Sem resumo disponível."}</p>
              <p className="text-sm italic text-secondary/80">{course?.subtitle}</p>
            </div>
            <div className="space-y-4">
              <h2 className="text-xl font-bold">O que você vai aprender</h2>
              <ul className="space-y-3">
                {normalizedGoals.length > 0 ? (
                  normalizedGoals.map((goal: string, i: number) => (
                    <li key={i} className="flex gap-2 text-sm text-secondary">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#b3e51d] mt-1.5 shrink-0" />
                      {goal?.replace(/^\d+\.\s*/, '').replace(/^[•-]\s*/, '')}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-secondary italic">Consulte o conteúdo programático completo na plataforma.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 2 — PLAYER DA AULA */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold font-serif">{isSwitchingLesson ? "Carregando aula..." : (lesson?.title || course?.title || "Aula em destaque")}</h2>
        <Card className="overflow-hidden border-border shadow-sm">
          <CardContent className="p-0 bg-black aspect-video flex items-center justify-center relative">
            {isLoadingLesson || isSwitchingLesson ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-10 h-10 text-[#b3e51d] animate-spin" />
                <p className="text-white/60 text-sm font-medium">Preparando seu ambiente de aprendizado...</p>
              </div>
            ) : currentVideoUrl ? (
              <div className="w-full h-full">
                {isSwitchingLesson && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <Loader2 className="w-12 h-12 text-[#b3e51d] animate-spin" />
                  </div>
                )}
              <video 
                key={lesson?.id}
                ref={videoRef}
                controls 
                className="w-full h-full"
                poster={lesson?.thumbnail || lesson?.poster || course?.banner}
              >
                <source 
                  src={currentVideoUrl} 
                  type="video/mp4" 
                />
                Seu navegador não suporta vídeos.
              </video>
              <div className="absolute bottom-0 left-0 w-full h-1.5 bg-white/20 z-10">
                <div 
                  className="h-full bg-[#b3e51d] shadow-[0_0_10px_rgba(179,229,29,0.8)] transition-all duration-300" 
                  style={{ width: `${videoProgress}%` }}
                />
              </div>
              </div>
            ) : (
              <div className="p-12 text-center space-y-4">
                <p className="text-white/60">Não foi possível carregar o vídeo desta aula.</p>
                <Button onClick={() => fetchLesson()} variant="secondary" size="sm">Tentar Novamente</Button>
              </div>
            )}
          </CardContent>
          {lesson && (
            <CardFooter className="p-4 bg-muted/30 border-t border-border flex-col gap-3">
              {lessonsGallery.length > 1 && (() => {
                const idx = lessonsGallery.findIndex(l => l.id === lesson?.id);
                const prev = idx > 0 ? lessonsGallery[idx - 1] : null;
                const next = idx >= 0 && idx < lessonsGallery.length - 1 ? lessonsGallery[idx + 1] : null;
                return (
                  <div className="flex justify-between items-center w-full gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!prev || isSwitchingLesson}
                      onClick={() => prev && fetchLesson(prev.id)}
                      className="gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Aula anterior
                    </Button>
                    <span className="text-xs text-secondary">
                      {idx + 1} / {lessonsGallery.length}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!next || isSwitchingLesson}
                      onClick={() => next && fetchLesson(next.id)}
                      className="gap-1"
                    >
                      Próxima aula
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })()}
              <div className="flex justify-between items-center w-full">
                <p className="text-xs text-secondary">Pronto para testar o que aprendeu nesta aula?</p>
                {!showQuiz && !isQuizFinished && (
                  <Button 
                    size="sm" 
                    onClick={() => handleStartQuiz(lesson?.id)}
                    className="bg-accent hover:bg-accent/90 text-primary-foreground font-bold"
                  >
                    Teste de Conhecimento
                  </Button>
                )}
              </div>
            </CardFooter>
          )}
        </Card>
      </section>

      {/* SEÇÃO 2.5 — GALERIA DE AULAS */}
      {lessonsGallery.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold font-serif">Todas as aulas do curso</h2>
            <span className="text-sm text-secondary">{lessonsGallery.length} aulas</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {lessonsGallery.map((l, idx) => {
              const isActive = lesson?.id === l.id;
              const completed = isLessonCompleted(course?.id, l.id);
              return (
                <button
                  key={l.id}
                  disabled={isSwitchingLesson || isActive}
                  onClick={() => {
                    fetchLesson(l.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={cn(
                    "group text-left rounded-xl overflow-hidden border bg-card transition-all hover:shadow-md disabled:opacity-100",
                    isActive ? "border-accent ring-2 ring-accent/30" : "border-border hover:border-accent/40"
                  )}
                >
                  <div className="relative aspect-video bg-muted overflow-hidden">
                    {l.thumbnail || course?.banner ? (
                      <img 
                        src={l.thumbnail || course?.banner} 
                        alt={l.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                        <PlayCircle className="w-10 h-10 text-secondary/60" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-black/70 text-white border-none text-[10px] font-bold">
                        Aula {String(idx + 1).padStart(2, '0')}
                      </Badge>
                    </div>
                    {completed && (
                      <div className="absolute top-2 right-2 bg-[#b3e51d] rounded-full p-1">
                        <CheckCircle2 className="w-3 h-3 text-[#051124]" />
                      </div>
                    )}
                    {isActive && (
                      <div className="absolute bottom-2 right-2">
                        <Badge className="bg-accent text-primary-foreground border-none text-[10px] font-bold">
                          Assistindo
                        </Badge>
                      </div>
                    )}
                    {isSwitchingLesson && isActive && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-bold leading-tight line-clamp-2 min-h-[2rem]">
                      {l.title}
                    </p>
                    {l.duration && (
                      <p className="text-[10px] text-secondary mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Math.floor(l.duration / 60)}min
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}


      {/* SEÇÃO 3 — QUIZ */}
      {showQuiz && (
        <section id="quiz-section" className="space-y-6 pt-8 border-t-2 border-dashed border-border">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold font-serif">Desafio Rápido</h2>
            <p className="text-secondary italic">Para fixar o conteúdo mais importante da aula.</p>
          </div>
          <div className="max-w-3xl mx-auto">
            {renderQuiz()}
          </div>
        </section>
      )}
    </div>
  </div>
  );
}
