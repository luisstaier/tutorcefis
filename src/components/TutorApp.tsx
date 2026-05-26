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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const handleOnboardingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("tutor_cefs_profile", JSON.stringify(formData));
    nextStep();
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
              <div className="animate-pulse flex flex-col items-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <User className="text-accent w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold">Analisando seu perfil...</h2>
                <p className="text-secondary mt-2">Nossa IA está construindo um diagnóstico personalizado baseado em seus dados.</p>
              </div>
              <Button onClick={nextStep} variant="outline" className="mt-8 border-accent text-accent hover:bg-accent/5">
                Ver diagnóstico completo
              </Button>
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
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 bg-muted/30 rounded-lg border border-border flex gap-4 items-start">
                    <div className="bg-white w-8 h-8 rounded-full flex items-center justify-center text-accent font-bold border border-border">
                      {i}
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">Módulo {i}: Fundamentos de {formData.objetivo}</h4>
                      <p className="text-sm text-secondary">Descrição detalhada do conteúdo e objetivos de aprendizado.</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-8">
                <Button variant="ghost" onClick={prevStep} className="text-secondary">Voltar</Button>
                <Button onClick={nextStep} className="bg-accent hover:bg-accent/90 text-white">Configurar Sessão Rápida</Button>
              </div>
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
                <Button className="w-full bg-accent hover:bg-accent/90 text-white h-12">
                  Gerar Sessão de {modoData.minutos || 'X'} min
                </Button>
              </div>
              
              <div className="pt-6 border-t border-border">
                <div className="p-8 bg-muted/20 rounded-lg border border-dashed border-secondary/30 text-center">
                  <BookOpen className="mx-auto text-secondary/40 w-12 h-12 mb-4" />
                  <p className="text-secondary italic">Resultado da sessão aparecerá aqui...</p>
                </div>
              </div>
              
              <Button variant="link" className="w-full text-secondary" onClick={nextStep}>Ver Catálogo de Cursos</Button>
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
