import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepIndicatorStep {
  label: string;
}

interface StepIndicatorProps {
  steps: StepIndicatorStep[];
  /** Zero-based index of the active step. */
  current: number;
  /** Optional click handler to allow jumping to a (completed) step. */
  onStepClick?: (index: number) => void;
  className?: string;
}

const GOLD = "#C8860A";

/**
 * Numbered horizontal stepper with gold active/completed states, connectors,
 * responsive labels and accessible markup (aria-current on the active step).
 */
export default function StepIndicator({
  steps,
  current,
  onStepClick,
  className,
}: StepIndicatorProps) {
  return (
    <nav aria-label="Progreso de configuración" className={cn("w-full", className)}>
      <ol className="flex items-center">
        {steps.map((step, i) => {
          const isCompleted = i < current;
          const isActive = i === current;
          const isLast = i === steps.length - 1;
          const clickable = Boolean(onStepClick) && (isCompleted || isActive);

          return (
            <li
              key={step.label}
              className={cn("flex items-center", !isLast && "flex-1")}
            >
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepClick?.(i)}
                aria-current={isActive ? "step" : undefined}
                aria-label={`Paso ${i + 1}: ${step.label}`}
                className={cn(
                  "group flex items-center gap-2.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C8860A]/50",
                  clickable ? "cursor-pointer" : "cursor-default",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300",
                    isActive && "border-[#C8860A] bg-[#C8860A] text-white shadow-[0_0_0_4px_rgba(200,134,10,0.18)]",
                    isCompleted && "border-[#C8860A] bg-[#C8860A]/15 text-[#C8860A]",
                    !isActive && !isCompleted && "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                </span>
                <span
                  className={cn(
                    "hidden text-sm font-medium transition-colors sm:inline-block",
                    isActive && "text-foreground",
                    isCompleted && "text-foreground/80",
                    !isActive && !isCompleted && "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </button>

              {!isLast && (
                <span
                  aria-hidden
                  className="mx-2 h-0.5 flex-1 rounded-full bg-border overflow-hidden sm:mx-3"
                >
                  <span
                    className="block h-full rounded-full transition-all duration-500"
                    style={{
                      width: isCompleted ? "100%" : "0%",
                      backgroundColor: GOLD,
                    }}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
