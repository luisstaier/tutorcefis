import { useState, useEffect } from "react";
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
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1862.89 641.11" className={className} fill="currentColor">
    <path d="M1862.89,340.46c-.78,6.53-1.54,13.07-2.35,19.59-8,63.91-32.87,120.52-74.93,169.23C1735.3,587.53,1672,624.33,1596,636.44,1491.8,653,1399.79,625.5,1322.17,553.77c-52.5-48.51-85.11-108.81-96.28-179.37-16.47-104.12,11-196,82.75-273.6,48.45-52.35,108.82-83.89,179.08-96.3,10.74-1.9,21.7-2.57,32.55-3.84a8.6,8.6,0,0,0,1.88-.66H1562a35.74,35.74,0,0,0,3.53.75c10.3,1.24,20.69,1.94,30.89,3.74C1667,17,1727.17,49.07,1776.18,101.3,1823.72,152,1851.77,212,1860.53,281c.83,6.54,1.58,13.08,2.36,19.62Zm-320.83-254c-129.18,0-234.16,104.63-234.22,233.76-.06,128.56,102.79,231.63,229.1,234.27,131.41,2.74,237-101.75,239.37-229.37C1778.78,192.82,1671.92,86.34,1542.06,86.5Z"/>
    <path d="M474.76,267.24v56.52H358.91v93.06H488.07V473h-199V128.08H481.31v59.54H362.14v79.62Z"/>
    <path d="M1107,141.56c-5,19.07-10,37.83-15,57-16.45-9.75-34.3-13.27-52.46-15.4a76.54,76.54,0,0,0-38.32,4.83c-26.14,10.67-31,40.06-9.84,59,9,8,19.38,13.8,30.26,18.65,20.52,9.14,40.49,19.23,58.55,32.66,18.27,13.59,31.93,30.6,37.23,53.25,8.31,35.59-4.17,86.58-52.58,111-18.77,9.48-38.79,13.61-59.62,14.2-34.09,1-66.76-6.18-98.75-17.31-3.14-1.09-3.93-2.27-3.08-5.61,4.48-17.67,8.67-35.41,12.95-53.06,23.89,12,49.42,16.55,75.6,18.25,12.86.84,25.4-.75,37-7a37.57,37.57,0,0,0,9.21-59.1c-9.11-9.42-20.52-15.46-32-21.28-20.47-10.4-40.91-20.74-59.58-34.33-17.42-12.69-31.07-28.19-36.81-49.17-8.8-32.21.55-60.14,22.79-84,20-21.44,45.76-32.1,74.3-36.13,33.18-4.67,65.34.42,96.61,11.9C1104.51,140.34,1105.48,140.86,1107,141.56Z"/>
    <path d="M232.72,195.54c-18.09-7.63-36.71-12-56.16-12.41-48.95-1-81.22,27.36-94.55,68.81-12.17,37.83-10.79,76,4.4,112.88,13.4,32.51,39.23,49.81,73.66,54.49,23.66,3.21,46.61-.28,68.87-8.71l5.11-1.92c3.29,18.5,6.54,36.82,9.93,55.93-7.69,2.27-15.23,4.83-22.94,6.72a240.25,240.25,0,0,1-80.29,6.31A152.62,152.62,0,0,1,7.9,368.08c-9.36-32-9.75-64.31-4.58-96.93,4.26-26.88,12.36-52.37,27-75.57,20.45-32.35,49.93-52.14,86.23-62.7,22.9-6.66,46.39-7.26,69.94-6.93,14.85.2,29.57,1.85,43.83,6.22A127.44,127.44,0,0,1,245,138c1,.44,2.19,2.37,2,3.29-4.39,17.84-9,35.62-13.55,53.42C233.33,194.91,233.07,195.1,232.72,195.54Z"/>
    <path d="M608.14,187.52v86.4H720.66v56.51H608.06V473H538.4V128.12h189v59.4Z"/>
    <path d="M784.41,131.4h69.33V473H784.41Z"/>
  </svg>
);

export default function TutorApp() {
  const [step, setStep] = useState(-1);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userKey, setUserKey] = useState<string | undefined>();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [formData, setFormData] = useState({ nome: "", objetivo: "", experiencia: "", nivel: "" });
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [completedLessons, setCompletedLessons] = useState<Record<number, number[]>>({});
  const [diagnosis, setDiagnosis] = useState<any[]>([]);
  const [studyPlan, setStudyPlan] = useState<any[]>([]);
  const [quickSession, setQuickSession] = useState<any>(null);
  const [navigationContext, setNavigationContext] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isGeneratingSession, setIsGeneratingSession] = useState(false);
  const [duvida, setDuvida] = useState("");
  const [chatHistory, setChatHistory] = useState<{ pergunta: string; resposta: string; fonte?: any }[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [modoData, setModoData] = useState({ minutos: "", topico: "" });

  useEffect(() => {
    const savedKey = sessionStorage.getItem("cefis_user_key");
    const savedProfile = localStorage.getItem("tutor_cefis_profile");
    if (savedKey && savedProfile) {
      setUserKey(savedKey);
      setFormData(JSON.parse(savedProfile));
      setIsAuthenticated(true);
      setStep(0);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError(null);
    try {
      const { data, error: functionError } = await supabase.functions.invoke('cefis-login', {
        body: { email: loginEmail, pass: loginPass }
      });
      if (functionError || data.error) throw new Error(data.error || "Erro no login");
      
      sessionStorage.setItem("cefis_user_key", data.key);
      const profile = { nome: data.userName, objetivo: "", experiencia: data.occupation, nivel: data.nivel || "iniciante" };
      localStorage.setItem("tutor_cefis_profile", JSON.stringify(profile));
      
      setUserKey(data.key);
      setFormData(profile);
      setIsAuthenticated(true);
      setStep(0);
      toast.success("Conectado com sucesso!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("cefis_user_key");
    localStorage.removeItem("tutor_cefis_profile");
    setUserKey(undefined);
    setIsAuthenticated(false);
    setStep(-1);
  };

  const handleSearchCourses = async (query?: string, courseId?: number, autoOpen = false, context?: any) => {
    setIsLoading(true);
    try {
      const { data } = await supabase.functions.invoke('cefis-courses', {
        body: { ...((courseId !== undefined && courseId !== null) ? { id: courseId } : { search: query || searchQuery }), userKey }
      });
      setCourses(data.data || []);
      if (courseId) {
        setSelectedCourse(data.data[0]);
        setNavigationContext(context || { source: 'catalogo' });
        setStep(6);
      } else {
        setStep(5);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteLesson = (courseId: number, lessonId: number) => {
    setCompletedLessons(prev => ({ ...prev, [courseId]: [...(prev[courseId] || []), lessonId] }));
  };

  const isLessonCompleted = (courseId: number, lessonId: number) => completedLessons[courseId]?.includes(lessonId) || false;

  const renderNavigation = () => (
    <nav className="flex flex-wrap justify-center gap-2 mb-8 bg-card/50 p-2 rounded-2xl border border-border">
      {[
        { id: 0, label: "Início", icon: Home },
        { id: 1, label: "Diagnóstico", icon: ClipboardCheck },
        { id: 2, label: "Plano", icon: LayoutDashboard },
        { id: 3, label: "Sessão Rápida", icon: Zap },
        { id: 4, label: "Dúvidas", icon: MessageCircle },
        { id: 5, label: "Catálogo", icon: Library },
      ].map((item) => (
        <Button key={item.id} variant={step === item.id ? "default" : "ghost"} onClick={() => setStep(item.id)} className="gap-2">
          <item.icon className="w-4 h-4" /> {item.label}
        </Button>
      ))}
    </nav>
  );

  const renderContent = () => {
    if (!isAuthenticated) {
      return (
        <Card className="max-w-md mx-auto mt-20 border-border shadow-lg">
          <CardHeader className="text-center">
            <CefisLogo className="w-32 mx-auto mb-4" />
            <CardTitle>Login CEFIS</CardTitle>
            <CardDescription>Acesse sua conta para começar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <Label>Email</Label>
                <Input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required type="email" />
              </div>
              <div className="space-y-1">
                <Label>Senha</Label>
                <Input value={loginPass} onChange={(e) => setLoginPass(e.target.value)} required type="password" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full bg-accent" disabled={isLoggingIn}>
                {isLoggingIn ? <Loader2 className="animate-spin" /> : "Entrar com minha conta CEFIS"}
              </Button>
            </form>
          </CardContent>
        </Card>
      );
    }

    switch (step) {
      case 0:
        return (
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h1 className="text-3xl font-bold">Olá, {formData.nome}!</h1>
            <Badge className="bg-green-500/10 text-green-600 border-green-200">✓ Perfil CEFIS carregado</Badge>
            <p className="text-secondary">Seu nível atual é {formData.nivel}. Vamos começar?</p>
            <Button onClick={() => setStep(1)} className="bg-accent">Iniciar Diagnóstico</Button>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <div className="flex gap-2">
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar cursos..." />
              <Button onClick={() => handleSearchCourses()}><Search className="w-4 h-4" /></Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.map(c => (
                <Card key={c.id} className="cursor-pointer hover:border-accent" onClick={() => handleSearchCourses(undefined, c.id)}>
                  <CardHeader><CardTitle className="text-lg">{c.title}</CardTitle></CardHeader>
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
            onBack={() => setStep(5)}
            onQuestion={(title) => { setDuvida(`Dúvida sobre ${title}`); setStep(4); }}
            onCompleteLesson={handleCompleteLesson}
            isLessonCompleted={isLessonCompleted}
          />
        );
      default:
        return <div className="text-center py-20">Selecione uma opção no menu.</div>;
    }
  };

  return (
    <main className="min-h-screen p-4 bg-background">
      {isAuthenticated && (
        <div className="flex justify-between items-center mb-8">
          <CefisLogo className="w-24" />
          <Button variant="ghost" onClick={handleLogout} className="text-xs">Sair</Button>
        </div>
      )}
      {isAuthenticated && renderNavigation()}
      {renderContent()}
      <Toaster />
    </main>
  );
}
