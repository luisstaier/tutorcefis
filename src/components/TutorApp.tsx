import { useState } from "react";
import { Stepper } from "@/components/Stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, BookOpen, User } from "lucide-react";

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

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const handleOnboardingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("tutor_cefs_profile", JSON.stringify(formData));
    nextStep();
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
              
              <Button variant="link" className="w-full text-secondary" onClick={() => setStep(0)}>Reiniciar Tutorial</Button>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen pb-12">
      <div className="max-w-4xl mx-auto px-4">
        <header className="py-8 flex flex-col items-center">
          <h1 className="text-4xl font-black text-foreground tracking-tight mb-2">Tutor <span className="text-accent">CEFIS</span></h1>
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
