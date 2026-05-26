import { cn } from "@/lib/utils";

export const TutorAiLogo = ({ className = "", showText = true }: { className?: string, showText?: boolean }) => (
  <div className={cn("flex items-center gap-1.5", className)}>
    <div className="relative flex items-center justify-center w-6 h-6 rounded-lg bg-accent rotate-3 shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">
      <span className="text-primary-foreground font-black text-sm -rotate-3">T</span>
      <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#b3e51d] border border-accent shadow-sm" />
    </div>
    {showText && (
      <span className="font-serif font-black tracking-tight text-accent text-sm italic">
        tutor<span className="text-foreground/40">.</span>ai
      </span>
    )}
  </div>
);
