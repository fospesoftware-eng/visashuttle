import { Check } from "lucide-react";

interface Step {
  id: string;
  title: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className = "" }: StepperProps) {
  return (
    <div className={`flex items-center ${className}`} data-testid="stepper">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center">
            <div
              className={`
                relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                ${index < currentStep 
                  ? "bg-primary border-primary text-primary-foreground" 
                  : index === currentStep 
                    ? "border-primary text-primary bg-primary/10" 
                    : "border-muted-foreground/30 text-muted-foreground"
                }
              `}
              data-testid={`step-indicator-${step.id}`}
            >
              {index < currentStep ? (
                <Check className="w-5 h-5" />
              ) : (
                <span className="text-sm font-semibold">{index + 1}</span>
              )}
              {index === currentStep && (
                <span className="absolute -inset-1 rounded-full border-2 border-primary animate-pulse opacity-50" />
              )}
            </div>
            <div className="ml-3 hidden sm:block">
              <p 
                className={`text-sm font-medium ${
                  index <= currentStep ? "text-foreground" : "text-muted-foreground"
                }`}
                data-testid={`step-title-${step.id}`}
              >
                {step.title}
              </p>
              {step.description && (
                <p className="text-xs text-muted-foreground" data-testid={`step-description-${step.id}`}>
                  {step.description}
                </p>
              )}
            </div>
          </div>
          {index < steps.length - 1 && (
            <div 
              className={`flex-1 h-0.5 mx-4 transition-colors ${
                index < currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
