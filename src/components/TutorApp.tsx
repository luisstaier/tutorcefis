import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, BookOpen, User, Search, Loader2, Star, PlayCircle, MessageCircle, Send, Home, ClipboardCheck, LayoutDashboard, Zap, Library } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

const MarkdownRenderer = ({ content, className = "" }: { content: string; className?: string }) => (
  <ReactMarkdown 
    className={cn("text-sm", className)}
    components={{
      h1: ({ ...props }) => <h1 className="font-serif text-xl font-bold mb-3 text-foreground" {...props} />,
      h2: ({ ...props }) => <h2 className="font-serif text-lg font-bold mb-2 text-foreground" {...props} />,
      h3: ({ ...props }) => <h3 className="font-serif text-md font-bold mb-2 text-foreground" {...props} />,
      p: ({ ...props }) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
      ul: ({ ...props }) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
      ol: ({ ...props }) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
      li: ({ ...props }) => <li className="mb-1" {...props} />,
      blockquote: ({ ...props }) => <blockquote className="border-l-4 border-accent pl-4 italic my-4 text-secondary bg-accent/5 py-2 rounded-r" {...props} />,
      strong: ({ ...props }) => <strong className="font-bold text-accent" {...props} />,
      a: ({ ...props }) => <a className="text-accent underline hover:text-accent/80 transition-colors" {...props} />,
    }}
  >
    {content}
  </ReactMarkdown>
);

export default function TutorApp() {
  const [step, setStep] = useState(0); // 0: Início, 1: Diagnóstico, 2: Plano, 3: Sessão Rápida, 4: Dúvidas, 5: Catálogo
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
  const [diagnosis, setDiagnosis] = useState<any[]>([]);
  const [studyPlan, setStudyPlan] = useState<any[]>([]);
  const [quickSession, setQuickSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isGeneratingSession, setIsGeneratingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duvida, setDuvida] = useState("");
  const [chatHistory, setChatHistory] = useState<{pergunta: string, resposta: string}[]>([]);
  const [isAsking, setIsAsking] = useState(false);

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
    } catch (err: any) {
      console.error('Plan generation error:', err);
      setError(err.message || 'Erro ao gerar plano de estudos.');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleGenerateSession = async () => {
    if (!modoData.minutos || !modoData.topico) return;
    
    setIsGeneratingSession(true);
    setError(null);
    try {
      const { data, error: functionError } = await supabase.functions.invoke('tutor-tempo', {
        body: {
          minutos: parseInt(modoData.minutos),
          topico: modoData.topico,
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
      const { data, error: functionError } = await supabase.functions.invoke('tutor-duvidas', {
        body: {
          pergunta: perguntaAtual,
          perfil: formData
        }
      });

      if (functionError) throw functionError;
      
      setChatHistory(prev => [...prev, {
        pergunta: perguntaAtual,
        resposta: data.resposta || "Desculpe, não consegui processar sua dúvida."
      }]);
    } catch (err: any) {
      console.error('Duvida error:', err);
      setError(err.message || 'Erro ao enviar dúvida.');
    } finally {
      setIsAsking(false);
    }
  };

  const handleSearchCourses = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: functionError } = await supabase.functions.invoke(`cefis-courses?search=${encodeURIComponent(searchQuery)}`, {
        method: 'GET'
      });

      if (functionError) throw functionError;
      setCourses(data.data || []);
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
    { id: 5, label: "Catálogo", icon: Library },
  ];

  const renderNavigation = () => {
    return (
      <nav className="flex flex-wrap justify-center gap-1 md:gap-4 mb-8 bg-white/50 backdrop-blur-sm p-2 rounded-2xl border border-border sticky top-4 z-50">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setStep(item.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
              step === item.id 
                ? "bg-accent text-white shadow-md shadow-accent/20" 
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
                  <Select onValueChange={val => setFormData({...formData, nivel: val})} required>
                    <SelectTrigger className="focus:ring-accent">
                      <SelectValue placeholder="Selecione seu nível" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iniciante">Iniciante</SelectItem>
                      <SelectItem value="intermediário">Intermediário</SelectItem>
                      <SelectItem value="avançado">Avançado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-white font-bold h-12 text-lg shadow-lg shadow-accent/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  Começar Jornada
                </Button>
              </form>
            </CardContent>
          </Card>
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
                  <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
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
                                } text-white border-none`}
                              >
                                {gap.prioridade.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="text-sm text-secondary">
                              <MarkdownRenderer content={gap.por_que_importa} />
                            </div>
                            {gap.curso_cefis_relacionado && (
                              <div className="text-xs bg-muted/30 p-2 rounded border border-border flex items-center gap-2">
                                <span className="font-bold text-accent">Curso CEFIS:</span> {gap.curso_cefis_relacionado}
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
                    <Button 
                      onClick={handleGeneratePlan} 
                      disabled={isGeneratingPlan}
                      className="bg-accent hover:bg-accent/90 text-white font-bold"
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
                        <div className="absolute -left-10 top-0 w-8 h-8 rounded-full bg-white border-2 border-accent flex items-center justify-center text-accent font-bold z-10 shadow-sm">
                          {stepItem.passo}
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3 hover:bg-muted/50 transition-colors">
                          <div className="flex justify-between items-start gap-4">
                            <h4 className="font-bold text-lg leading-tight">{stepItem.titulo}</h4>
                            <Badge 
                              className={`${
                                stepItem.origem === 'catalogo_cefis' ? 'bg-success hover:bg-success' : 'bg-accent hover:bg-accent'
                              } text-white border-none shrink-0`}
                            >
                              {stepItem.origem === 'catalogo_cefis' ? (
                                <span className="flex items-center gap-1">📚 CEFIS</span>
                              ) : (
                                <span className="flex items-center gap-1">✨ Tutor</span>
                              )}
                            </Badge>
                          </div>
                          <div className="text-sm text-secondary">
                            <MarkdownRenderer content={stepItem.descricao} />
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/50">
                            <div className="flex items-center gap-1 text-xs text-secondary font-medium">
                              <Clock className="w-3 h-3" /> {stepItem.tempo_estimado_min} min
                            </div>
                            {stepItem.fonte && (
                              <div className="text-xs text-secondary font-medium italic truncate max-w-[250px]">
                                Fonte: {stepItem.fonte}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 pt-6 border-t border-border">
                    <Button onClick={() => setStep(3)} className="bg-accent hover:bg-accent/90 text-white font-bold">Ir para Sessão Rápida</Button>
                    <Button variant="outline" onClick={() => setStep(4)} className="border-accent text-accent hover:bg-accent/5 font-bold">Tirar Dúvida Agora</Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="p-4 bg-muted/50 rounded-lg border border-dashed border-border mb-6">
                    <p className="text-secondary italic">Nenhum plano gerado ainda.</p>
                  </div>
                  <Button onClick={handleGeneratePlan} className="bg-accent text-white">Gerar Plano de Estudos</Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      case 3:
        return (
          <Card className="max-w-2xl mx-auto border-border shadow-sm overflow-hidden">
            <div className="h-2 bg-accent w-full" />
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Zap className="text-accent" /> Modo "Tenho X minutos"
              </CardTitle>
              <CardDescription>Otimize seu tempo com uma micro-aula focada gerada pelo tutor.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minutos">Quantos minutos você tem?</Label>
                  <Input 
                    id="minutos" 
                    type="number" 
                    placeholder="Ex: 15"
                    value={modoData.minutos}
                    onChange={e => setModoData({...modoData, minutos: e.target.value})}
                    className="focus-visible:ring-accent"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="topico">Qual tópico deseja revisar?</Label>
                  <Input 
                    id="topico" 
                    placeholder="Ex: Impostos corporativos"
                    value={modoData.topico}
                    onChange={e => setModoData({...modoData, topico: e.target.value})}
                    className="focus-visible:ring-accent"
                  />
                </div>
              </div>
              <Button 
                onClick={handleGenerateSession} 
                disabled={isGeneratingSession || !modoData.minutos || !modoData.topico}
                className="w-full bg-accent hover:bg-accent/90 text-white h-12 font-bold shadow-lg shadow-accent/20"
              >
                {isGeneratingSession ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Otimizando conteúdo...
                  </>
                ) : (
                  `Gerar Sessão de ${modoData.minutos || 'X'} min`
                )}
              </Button>
              
              <div className="pt-6 border-t border-border">
                {isGeneratingSession ? (
                  <div className="flex flex-col items-center py-12">
                    <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
                    <p className="text-lg font-medium">Otimizando conteúdo para {modoData.minutos} minutos...</p>
                    <p className="text-sm text-secondary">Selecionando o melhor do catálogo CEFIS para você.</p>
                  </div>
                ) : error ? (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm mb-4">
                    {error}
                  </div>
                ) : quickSession?.itens && Array.isArray(quickSession.itens) && quickSession.itens.length > 0 ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-xl">Sua Micro-Trilha</h3>
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
                                } text-white border-none`}
                              >
                                {item?.origem === 'catalogo_cefis' ? '📚 CEFIS' : '✨ Tutor'}
                              </Badge>
                              {item?.fonte && (
                                <span className="text-xs text-secondary italic truncate max-w-[200px]">
                                  {item.fonte}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-border">
                      <Button onClick={() => setStep(2)} variant="outline" className="border-accent text-accent hover:bg-accent/5 font-bold">Voltar ao Plano</Button>
                      <Button onClick={() => setStep(4)} className="bg-accent hover:bg-accent/90 text-white font-bold">Tirar uma dúvida</Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 bg-muted/20 rounded-2xl border border-dashed border-secondary/30 text-center">
                    <BookOpen className="mx-auto text-secondary/40 w-16 h-16 mb-4" />
                    <p className="text-secondary font-medium italic">Preencha os campos acima para gerar sua micro-trilha personalizada.</p>
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
            <CardHeader className="bg-white/80 backdrop-blur-sm z-10 border-b border-border">
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
                      <div className="bg-accent text-white p-4 rounded-2xl rounded-tr-none max-w-[85%] text-sm shadow-md shadow-accent/10">
                        {chat.pergunta}
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-white p-5 rounded-2xl rounded-tl-none max-w-[90%] text-sm border border-border shadow-sm">
                        <MarkdownRenderer content={chat.resposta} />
                      </div>
                    </div>
                  </div>
                ))}
                {isAsking && (
                  <div className="flex justify-start animate-pulse">
                    <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-border flex items-center gap-3 shadow-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-accent" />
                      <span className="text-sm text-secondary font-medium">Tutor está consultando o catálogo...</span>
                    </div>
                  </div>
                )}
              </div>
              
              <form onSubmit={handleAskDuvida} className="p-4 bg-white border-t border-border flex gap-2">
                <Input 
                  placeholder="Ex: Como funciona a tributação do Simples Nacional?" 
                  value={duvida}
                  onChange={e => setDuvida(e.target.value)}
                  disabled={isAsking}
                  className="flex-1 h-12 focus-visible:ring-accent bg-muted/30 border-none"
                />
                <Button type="submit" disabled={isAsking || !duvida.trim()} size="icon" className="h-12 w-12 bg-accent hover:bg-accent/90 text-white shrink-0 rounded-xl shadow-lg shadow-accent/20">
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
                <form onSubmit={handleSearchCourses} className="flex flex-col sm:flex-row gap-2">
                  <Input 
                    placeholder="Contabilidade, Impostos, Auditoria, Carreira..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 h-12 focus-visible:ring-accent"
                  />
                  <Button type="submit" disabled={isLoading} className="h-12 px-8 bg-accent hover:bg-accent/90 text-white font-bold shadow-lg shadow-accent/20">
                    {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                    Buscar Cursos
                  </Button>
                </form>
              </CardContent>
            </Card>

            {error && (
              <div className="max-w-4xl mx-auto p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
                {error}
              </div>
            )}

            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.map((course) => (
                <Card key={course.id} className="border-border shadow-sm hover:shadow-md transition-all hover:border-accent/20 group">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-lg font-bold leading-tight group-hover:text-accent transition-colors">{course.title}</CardTitle>
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
                      <div className="flex items-center gap-3 text-xs text-secondary font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {Math.floor(course.duration / 3600)}h {Math.floor((course.duration % 3600) / 60)}min
                        </span>
                        <span className="flex items-center gap-1">
                          <PlayCircle className="w-3 h-3" /> {course.lessonCount} aulas
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" className="text-accent hover:text-accent hover:bg-accent/5 font-bold">
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
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen pb-12 bg-[#FAF8F3]">
      <div className="max-w-4xl mx-auto px-4">
        <header className="py-8 flex flex-col items-center">
          <div className="mb-6 flex flex-col items-center cursor-pointer" onClick={() => setStep(0)}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
                <BookOpen className="text-white w-6 h-6" />
              </div>
              <h1 className="text-4xl font-black text-foreground tracking-tight">
                Tutor <span className="text-accent">CEFIS</span>
              </h1>
            </div>
            <p className="text-secondary font-medium italic">Seu aprendizado, no seu tempo.</p>
          </div>
          
          {renderNavigation()}
        </header>
        
        <div className="transition-all duration-300">
          {renderContent()}
        </div>
        
        <footer className="mt-20 text-center border-t border-border pt-8 text-secondary/40 text-xs">
          © 2026 Tutor CEFIS - Inteligência Artificial integrada ao melhor conteúdo contábil.
        </footer>
      </div>
    </main>
  );
}
