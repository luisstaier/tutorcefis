import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, PlayCircle, Star, ArrowLeft, Loader2, MessageCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface CourseDetailsProps {
  course: any;
  onBack: () => void;
  userProfile: any;
  onQuestion: (courseTitle: string) => void;
  onCompleteLesson: (courseId: number, lessonId: number) => void;
  isLessonCompleted: (courseId: number, lessonId: number) => boolean;
}

export default function CourseDetails({ 
  course, 
  onBack, 
  userProfile, 
  onQuestion, 
  onCompleteLesson,
  isLessonCompleted
}: CourseDetailsProps) {
  const [lesson, setLesson] = useState<any>(null);
  const [isLoadingLesson, setIsLoadingLesson] = useState(true);
  const [quiz, setQuiz] = useState<any>(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<any[]>([]);
  const [isQuizFinished, setIsQuizFinished] = useState(false);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const quizTimerRef = useRef<any>(null);

  useEffect(() => {
    console.log("CourseDetails montado com courseId:", course?.id);
    if (!course?.id) {
      console.error("CourseDetails: course.id is missing");
      return;
    }
    fetchLesson();
    return () => {
      if (quizTimerRef.current) clearTimeout(quizTimerRef.current);
    };
  }, [course?.id]);

  const fetchLesson = async () => {
    if (!course?.id) return;
    setIsLoadingLesson(true);
    setHasError(false);
    try {
      const { data, error } = await supabase.functions.invoke('cefis-lesson', {
        body: { courseId: course.id }
      });
      if (error) throw error;
      setLesson(data);
      
      // Timer for quiz (10 seconds)
      quizTimerRef.current = setTimeout(() => {
        if (!showQuiz && !isQuizFinished) {
          handleStartQuiz(data?.id);
        }
      }, 10000);
    } catch (err) {
      console.error("Error fetching lesson:", err);
      setHasError(true);
    } finally {
      setIsLoadingLesson(false);
    }
  };

  const handleStartQuiz = async (lessonId: number) => {
    if (isLoadingQuiz || quiz) {
      setShowQuiz(true);
      return;
    }
    
    setIsLoadingQuiz(true);
    try {
      const { data, error } = await supabase.functions.invoke('tutor-quiz', {
        body: { 
          lessonId, 
          courseTitle: course?.title || "Curso", 
          nivel: userProfile?.nivel || "Iniciante" 
        }
      });
      if (error) throw error;
      setQuiz(data);
      setShowQuiz(true);
    } catch (err) {
      console.error("Error fetching quiz:", err);
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
        <div className="flex flex-col items-center py-8">
          <Loader2 className="w-8 h-8 text-[#b3e51d] animate-spin mb-2" />
          <p className="text-sm font-medium">Gerando desafio personalizado...</p>
        </div>
      );
    }

    if (quiz?.fallback) {
      return (
        <div className="p-6 bg-muted/50 rounded-xl text-center space-y-4">
          <p className="text-secondary">Quiz não disponível para esta aula no momento.</p>
          <Button 
            variant="outline" 
            className="border-accent text-accent hover:bg-accent/5 font-bold"
            onClick={() => onQuestion(course?.title || "Curso")}
          >
            <MessageCircle className="w-4 h-4 mr-2" /> Tirar uma dúvida
          </Button>
        </div>
      );
    }

    if (isQuizFinished) {
      const correctCount = (quizAnswers || []).filter(a => a.isCorrect).length;
      let message = "";
      if (correctCount === 4) message = "Excelente! Você dominou o conteúdo desta aula. 🎯";
      else if (correctCount === 3) message = "Muito bom! Você está no caminho certo. ⭐";
      else if (correctCount === 2) message = "Bom começo! Recomendamos rever a aula. 📖";
      else message = "Continue praticando! O tutor pode te ajudar com as dúvidas. 💪";

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
                {currentAnswer.isCorrect ? "✅ Correto!" : `❌ Incorreto. A resposta correta era ${currentQuestion.correta.toUpperCase()}.`}
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

  if (!course || !course.id) {
    return (
      <div className="p-8 text-center space-y-6 max-w-md mx-auto">
        <div className="bg-muted/30 p-8 rounded-3xl border border-border">
          <Loader2 className="w-10 h-10 text-accent animate-spin mx-auto mb-4" />
          <p className="text-secondary font-medium">Carregando informações do curso...</p>
        </div>
        <Button onClick={onBack} variant="ghost" className="text-secondary hover:text-accent font-medium">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Catálogo
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
          <Button onClick={fetchLesson} className="bg-accent hover:bg-accent/90 text-primary-foreground font-bold">
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">
      <Button 
        variant="ghost" 
        onClick={onBack}
        className="text-secondary hover:text-accent font-medium mb-2 -ml-2"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
      </Button>

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
              📚 Conteúdo CEFIS
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
                {course?.goals ? (
                  course.goals.split('\n').filter((g:string) => g.trim()).map((goal: string, i: number) => (
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
        <h2 className="text-2xl font-bold font-serif">Aula 01 — Introdução e Primeiros Passos</h2>
        <Card className="overflow-hidden border-border shadow-sm">
          <CardContent className="p-0 bg-black aspect-video flex items-center justify-center relative">
            {isLoadingLesson ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-10 h-10 text-[#b3e51d] animate-spin" />
                <p className="text-white/60 text-sm font-medium">Preparando seu ambiente de aprendizado...</p>
              </div>
            ) : (lesson?.stream_sources && lesson.stream_sources.length > 0) ? (
              <video 
                ref={videoRef}
                controls 
                className="w-full h-full"
                poster={course?.banner}
              >
                {/* Procura pela fonte 'sd' como solicitado, senão pega a primeira */}
                <source 
                  src={lesson.stream_sources.find((s: any) => s.quality === "sd")?.link_secure || lesson.stream_sources[0]?.link_secure} 
                  type="video/mp4" 
                />
                Seu navegador não suporta vídeos.
              </video>
            ) : (
              <div className="p-12 text-center space-y-4">
                <p className="text-white/60">Não foi possível carregar o vídeo desta aula.</p>
                <Button onClick={fetchLesson} variant="secondary" size="sm">Tentar Novamente</Button>
              </div>
            )}
          </CardContent>
          {lesson && (
            <CardFooter className="p-4 bg-muted/30 border-t border-border">
              <div className="flex justify-between items-center w-full">
                <p className="font-bold text-sm">{lesson.title}</p>
                {!showQuiz && !isQuizFinished && (
                  <Button 
                    size="sm" 
                    onClick={() => handleStartQuiz(lesson.id)}
                    className="bg-accent hover:bg-accent/90 text-primary-foreground font-bold"
                  >
                    Testar o que aprendi
                  </Button>
                )}
              </div>
            </CardFooter>
          )}
        </Card>
      </section>

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
  );
}

