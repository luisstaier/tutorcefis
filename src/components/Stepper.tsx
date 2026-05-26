import { Progress } from "@/components/ui/progress";

export const steps = [
  { id: 'onboarding', title: 'Onboarding' },
  { id: 'diagnostico', title: 'Diagnóstico' },
  { id: 'plano', title: 'Plano' },
  { id: 'modo', title: 'Modo' },
  { id: 'conteudo', title: 'Conteúdo' },
];

export const Stepper = ({ currentStep }: { currentStep: number }) => {
  const progress = ((currentStep + 1) / steps.length) * 100;
  
  return (
    <div className="w-full py-6 px-4">
      <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-secondary mb-2">
        {steps.map((step, idx) => (
          <span key={step.id} className={idx <= currentStep ? 'text-accent' : ''}>
            {step.title}
          </span>
        ))}
      </div>
      <Progress value={progress} className="h-2 bg-muted" />
    </div>
  );
};
