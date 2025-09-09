"use client";

import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
import { Calculator, Clock } from "lucide-react";
import { CalculationResult } from "@/types/form-types";
import { calculatePrice } from "@/utils/calculation";
import { FormSubmissionData, FormConfig } from "@/types/form-types";

interface CalculatingScreenProps {
  onComplete: (result: CalculationResult) => void;
  formData: FormSubmissionData;
  formConfig: FormConfig;
}

export function CalculatingScreen({ onComplete, formData, formConfig }: CalculatingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    "Analýza požadavků",
    "Výpočet koeficientů",
    "Aplikace lokálních sazeb",
    "Kontrola inflace",
    "Finální kalkulace"
  ];

  useEffect(() => {
    // Animate progress bar
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressTimer);
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    // Animate calculation steps
    const stepTimer = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= steps.length - 1) {
          clearInterval(stepTimer);
          return steps.length - 1;
        }
        return prev + 1;
      });
    }, 800);

    // Complete calculation after progress reaches 100%
    const completionTimer = setTimeout(async () => {
      // Use the real calculation utility instead of mock data
      const realResult = await calculatePrice(formData, formConfig);
      onComplete(realResult);
    }, 5000);

    return () => {
      clearInterval(progressTimer);
      clearInterval(stepTimer);
      clearTimeout(completionTimer);
    };
  }, [onComplete, steps.length, formData, formConfig]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-background via-secondary to-background flex items-center justify-center p-4"
    >
      <div className="w-full max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex justify-center mb-6">
            <Calculator className="h-16 w-16 text-accent" />
          </div>
          
          <h1 className="text-3xl font-bold text-foreground font-heading mb-4">
            Počítáme cenu úklidových služeb
          </h1>
          
          <p className="text-muted-foreground text-lg font-sans">
            Prosím vyčkejte, analyzujeme vaše požadavky a vypočítáme přesnou cenu
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mb-8"
        >
          <div className="bg-card border rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">
                Průběh výpočtu
              </span>
              <span className="text-sm font-medium text-accent">
                {progress}%
              </span>
            </div>
            
            <Progress value={progress} className="h-3 mb-4" />
            
            <div className="text-left">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ 
                    opacity: index <= currentStep ? 1 : 0.5,
                    x: 0 
                  }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  className={`flex items-center gap-3 py-2 ${
                    index <= currentStep ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-current">
                    {index < currentStep ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.1 + 0.2 }}
                        className="w-2 h-2 bg-current rounded-full"
                      />
                    ) : (
                      <span className="text-xs">{index + 1}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium">{step}</span>
                  {index === currentStep && (
                    <motion.div
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <Clock className="h-4 w-4 text-accent" />
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-sm text-muted-foreground"
        >
          <p>Výpočet obvykle trvá 5-10 sekund</p>
          <p>Výsledek bude zahrnovat všechny vaše požadavky a specifika</p>
        </motion.div>
      </div>
    </motion.div>
  );
}
