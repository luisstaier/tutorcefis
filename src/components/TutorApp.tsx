import { useState } from "react";
import { Stepper } from "@/components/Stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, BookOpen, User, Search, Loader2, Star, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function TutorApp() {
  const [step, setStep] = useState(0);
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

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

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



  const handleSearchCourses = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const url = new URL(`${window.location.origin}/functions/v1/cefis-courses`);
      if (searchQuery) url.searchParams.set('search', searchQuery);
      
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

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <Card className="max-w-md mx-auto border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-3xl font-bold">Bem-vindo ao Tutor CEFIS</CardTitle>
              <CardDescription className="text-secondary text-lg">
                Vamos personalizar sua jornada de aprendizado.
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nivel">Nível de conhecimento</Label>
                  <Select onValueChange={val => setFormData({...formData, nivel: val})} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione seu nível" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iniciante">Iniciante</SelectItem>
                      <SelectItem value="intermediário">Intermediário</SelectItem>
                      <SelectItem value="avançado">Avançado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-white font-bold h-12 text-lg">
                  Começar Jornada
                </Button>
              </form>
            </CardContent>
          </Card>
        );
      case 1:
        return (
          <Card className="max-w-md mx-auto border-border shadow-sm text-center py-12">
            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="flex flex-col items-center">
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
                    {diagnosis.map((gap, i) => (
                      <Card key={i} className="border-border">
                        <CardContent className="pt-6 space-y-3">
                          <div className="flex justify-between items-start">
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
                          <p className="text-sm text-secondary">{gap.por_que_importa}</p>
                          {gap.curso_cefis_relacionado && (
                            <div className="text-xs bg-muted/30 p-2 rounded border border-border">
                              <span className="font-bold text-accent">Curso CEFIS:</span> {gap.curso_cefis_relacionado}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Button 
                    onClick={handleGeneratePlan} 
                    disabled={isGeneratingPlan}
                    className="w-full bg-accent hover:bg-accent/90 text-white"
                  >
                    {isGeneratingPlan ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Montando seu plano...
                      </>
                    ) : (
                      "Ver Plano de Estudos"
                    )}
                  </Button>
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
              <CardDescription className="text-lg">Estrutura recomendada para {formData.objetivo}.</CardDescription>
            </CardHeader>
            <CardContent>
              {isGeneratingPlan ? (
                <div className="flex flex-col items-center py-12">
                  <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
                  <h3 className="text-xl font-bold">Montando seu plano...</h3>
                  <p className="text-secondary mt-2 text-center">Cruzando o catálogo da CEFIS com seu perfil.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative pl-8 space-y-8 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-muted">
                    {studyPlan.map((step, i) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-10 top-0 w-8 h-8 rounded-full bg-white border-2 border-accent flex items-center justify-center text-accent font-bold z-10 shadow-sm">
                          {step.passo}
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
                          <div className="flex justify-between items-start gap-4">
                            <h4 className="font-bold text-lg leading-tight">{step.titulo}</h4>
                            <Badge 
                              className={`${
                                step.origem === 'catalogo_cefis' ? 'bg-success hover:bg-success' : 'bg-accent hover:bg-accent'
                              } text-white border-none shrink-0`}
                            >
                              {step.origem === 'catalogo_cefis' ? (
                                <span className="flex items-center gap-1">📚 CEFIS</span>
                              ) : (
                                <span className="flex items-center gap-1">✨ Tutor</span>
                              )}
                            </Badge>
                          </div>
                          <p className="text-sm text-secondary">{step.descricao}</p>
                          
                          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/50">
                            <div className="flex items-center gap-1 text-xs text-secondary font-medium">
                              <Clock className="w-3 h-3" /> {step.tempo_estimado_min} min
                            </div>
                            {step.fonte && (
                              <div className="text-xs text-secondary font-medium italic">
                                Fonte: {step.fonte}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-8 pt-6 border-t border-border">
                    <Button variant="ghost" onClick={() => setStep(1)} className="text-secondary">Voltar ao Diagnóstico</Button>
                    <Button onClick={() => setStep(3)} className="bg-accent hover:bg-accent/90 text-white">Configurar Sessão Rápida</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      case 3:
        return (
          <Card className="max-w-md mx-auto border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Clock className="text-accent" /> Modo "Tenho X minutos"
              </CardTitle>
              <CardDescription>Otimize seu tempo com uma micro-aula focada.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="minutos">Quantos minutos você tem?</Label>
                  <Input 
                    id="minutos" 
                    type="number" 
                    placeholder="Ex: 15"
                    value={modoData.minutos}
                    onChange={e => setModoData({...modoData, minutos: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="topico">Qual tópico deseja revisar?</Label>
                  <Input 
                    id="topico" 
                    placeholder="Ex: Impostos corporativos"
                    value={modoData.topico}
                    onChange={e => setModoData({...modoData, topico: e.target.value})}
                  />
                </div>
                <Button 
                  onClick={handleGenerateSession} 
                  disabled={isGeneratingSession || !modoData.minutos || !modoData.topico}
                  className="w-full bg-accent hover:bg-accent/90 text-white h-12"
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
              </div>
              
              <div className="pt-6 border-t border-border">
                {quickSession ? (
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg">Sua Micro-Trilha ({quickSession.total_min} min)</h3>
                    <div className="space-y-4">
                      {quickSession.itens.map((item: any, i: number) => (
                        <div key={i} className="p-4 bg-muted/30 rounded-lg border border-border space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold text-md">{item.titulo}</h4>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {item.tempo_min} min
                            </Badge>
                          </div>
                          <p className="text-sm text-secondary">{item.resumo}</p>
                          <div className="flex items-center justify-between pt-2">
                            <Badge 
                              className={`${
                                item.origem === 'catalogo_cefis' ? 'bg-success hover:bg-success' : 'bg-accent hover:bg-accent'
                              } text-white border-none text-[10px]`}
                            >
                              {item.origem === 'catalogo_cefis' ? '📚 CEFIS' : '✨ Tutor'}
                            </Badge>
                            {item.fonte && (
                              <span className="text-[10px] text-secondary italic truncate max-w-[150px]">
                                {item.fonte}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 bg-muted/20 rounded-lg border border-dashed border-secondary/30 text-center">
                    <BookOpen className="mx-auto text-secondary/40 w-12 h-12 mb-4" />
                    <p className="text-secondary italic">Resultado da sessão aparecerá aqui...</p>
                  </div>
                )}
              </div>
              
              <Button variant="link" className="w-full text-secondary" onClick={() => setStep(4)}>Ver Catálogo de Cursos</Button>
              <Button variant="link" className="w-full text-secondary" onClick={() => setStep(0)}>Reiniciar Tutorial</Button>
            </CardContent>
          </Card>
        );
      case 4:
        return (
          <div className="space-y-6">
            <Card className="max-w-4xl mx-auto border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Search className="text-accent" /> Conteúdo CEFIS (Teste)
                </CardTitle>
                <CardDescription>Busque por cursos reais na plataforma CEFIS.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearchCourses} className="flex gap-2">
                  <Input 
                    placeholder="Busque por contabilidade, impostos, carreira..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isLoading} className="bg-accent hover:bg-accent/90 text-white">
                    {isLoading ? <Loader2 className="animate-spin" /> : "Buscar"}
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
                <Card key={course.id} className="border-border shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-lg font-bold leading-tight">{course.title}</CardTitle>
                      {course.averageRating && (
                        <div className="flex items-center text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-xs font-bold shrink-0">
                          <Star className="w-3 h-3 fill-current mr-1" />
                          {course.averageRating}
                        </div>
                      )}
                    </div>
                    <CardDescription className="text-sm italic">{course.subtitle}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-secondary line-clamp-3">{course.summary || 'Sem resumo disponível.'}</p>
                    
                    <div className="flex flex-wrap gap-2">
                      {course.categories?.slice(0, 3).map((cat: any) => (
                        <Badge key={cat.id} variant="secondary" className="bg-muted/50 text-[10px] px-1.5 py-0">
                          {cat.name}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
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
                <div className="col-span-full py-12 text-center text-secondary italic">
                  Faça uma busca para ver os cursos disponíveis.
                </div>
              )}
            </div>
            
            <div className="max-w-4xl mx-auto flex justify-center">
              <Button variant="link" className="text-secondary" onClick={() => setStep(0)}>Reiniciar Tutorial</Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen pb-12">
      <div className="max-w-4xl mx-auto px-4">
        <header className="py-8 flex flex-col items-center relative">
          <div className="absolute right-0 top-8 hidden md:block">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs border-accent text-accent hover:bg-accent/5"
              onClick={() => setStep(4)}
            >
              Testar Catálogo
            </Button>
          </div>
          <h1 className="text-4xl font-black text-foreground tracking-tight mb-2 cursor-pointer" onClick={() => setStep(0)}>
            Tutor <span className="text-accent">CEFIS</span>
          </h1>
          <p className="text-secondary font-medium italic">Seu aprendizado, no seu tempo.</p>
        </header>
        
        <Stepper currentStep={step} />
        
        <div className="mt-8 transition-all duration-300">
          {renderStep()}
        </div>
      </div>
    </main>
  );
}
