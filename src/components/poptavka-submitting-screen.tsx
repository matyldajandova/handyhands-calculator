"use client";

import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect, useRef } from "react";
import { FileText, Clock } from "lucide-react";
import Image from "next/image";

interface PoptavkaSubmittingScreenProps {
  onComplete: () => void;
  onSubmit: (onProgress: (step: number, progress: number) => void) => Promise<void>;
}

export function PoptavkaSubmittingScreen({ onComplete, onSubmit }: PoptavkaSubmittingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [targetProgress, setTargetProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const progressRef = useRef(0);
  const submissionFinishedRef = useRef(false);

  const steps = [
    "Příprava dat",
    "Vytváření smlouvy",
    "Ukládání smlouvy",
    "Export do Wordu a PDF",
    "Odesílání emailu",
    "Dokončování"
  ];

  // Smooth progress bar animation towards target
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        progressRef.current = prev;
        if (prev >= targetProgress - 0.1) {
          // If we're very close to target, continue with tiny movements to show it's alive
          if (prev >= targetProgress) {
            // Already at or past target, add tiny random movement to show it's alive
            const tinyMovement = (Math.random() - 0.5) * 0.05;
            const newProgress = Math.min(Math.max(prev + tinyMovement, targetProgress - 0.2), targetProgress + 0.1);
            progressRef.current = newProgress;
            return newProgress;
          }
          // Very close but not there yet - set to target
          progressRef.current = targetProgress;
          return targetProgress;
        }
        // Smoothly animate towards target with random variation to avoid looking stuck
        const diff = targetProgress - prev;
        const baseStep = diff * 0.15; // Base step size (15% of remaining distance)
        const randomFactor = 0.8 + Math.random() * 0.4; // Random variation between 80%-120%
        const step = Math.max(0.3, baseStep * randomFactor);
        const newProgress = Math.min(prev + step, targetProgress);
        progressRef.current = newProgress;
        return newProgress;
      });
    }, 50); // Update every 50ms for smooth animation

    return () => clearInterval(interval);
  }, [targetProgress]);

  useEffect(() => {
    let isRunning = false; // Prevent multiple runs

    const runSubmission = async () => {
      // Prevent multiple simultaneous runs
      if (isRunning) {
        console.warn('Submission already running, skipping duplicate call');
        return;
      }
      
      isRunning = true;
      
      try {
        // Progress callback to update UI based on actual operations
        const onProgress = (step: number, progressPercent: number) => {
          setCurrentStep(step);
          // Update target, not actual progress - animation will smoothly catch up
          setTargetProgress(progressPercent);
        };

        // Start submission process - wait for it to fully complete
        // This MUST complete before we call onComplete()
        await onSubmit(onProgress);
        
        // Mark submission as finished
        submissionFinishedRef.current = true;
        
        // Complete animation - ensure we're at the last step
        setCurrentStep(steps.length - 1);
        setTargetProgress(100);
        
        // Wait for progress bar to reach 100% before completing
        // Use a simple polling approach that checks if we're done
        let completionCheckCount = 0;
        const maxChecks = 200; // Max 20 seconds (200 * 100ms)
        
        const checkCompletion = () => {
          completionCheckCount++;
          
          // Safety check: if we've been checking too long, just complete
          if (completionCheckCount > maxChecks) {
            console.warn('Completion check timeout, forcing completion');
            setTimeout(() => {
              onComplete();
            }, 500);
            return;
          }
          
          if (progressRef.current >= 99 && submissionFinishedRef.current) {
            // Progress is complete and submission finished, wait a moment then call onComplete
            setTimeout(() => {
              onComplete();
            }, 500);
          } else {
            // Not complete yet, schedule another check
            setTimeout(checkCompletion, 100);
          }
        };
        
        // Start checking for completion
        setTimeout(checkCompletion, 100);
      } catch (error) {
        // On error, don't call onComplete - let the error handler in parent handle it
        // The error handler will hide the screen and show error message
        submissionFinishedRef.current = true;
        setTargetProgress(100);
        setCurrentStep(steps.length - 1);
        // Don't call onComplete here - parent handles error display
        throw error; // Re-throw so parent can handle it
      } finally {
        isRunning = false;
      }
    };

    // Start the actual submission immediately - no delays
    runSubmission();
    
    // Cleanup: prevent re-runs if component unmounts
    return () => {
      isRunning = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - we only want to run once on mount, props are stable and shouldn't change

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-background via-secondary to-background flex items-center justify-center p-4"
    >
      <div className="w-full max-w-2xl mx-auto text-center">
        {/* Brand Logo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-8"
        >
          <Image 
            src="/handyhands_horizontal.svg" 
            alt="HandyHands Logo" 
            width={200}
            height={80}
            className="h-12 md:h-16 w-auto"
            priority
          />
        </motion.div>

        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex justify-center mb-6">
            <FileText className="h-16 w-16 text-accent" />
          </div>
          
          <h1 className="text-3xl font-bold text-foreground font-heading mb-4">
            Odesílání návrhu smlouvy
          </h1>
          
          <p className="text-muted-foreground text-lg font-sans">
            Prosím vyčkejte, připravujeme vaši poptávku a generujeme dokumenty
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
                Průběh zpracování
              </span>
              <span className="text-sm font-medium text-accent">
                {Math.round(progress)}%
              </span>
            </div>
            
            <Progress value={progress} className="h-3 mb-4" />
            
            <div className="text-left">
              {steps.map((step, index) => {
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ 
                      opacity: isCompleted || isActive ? 1 : 0.5,
                      x: 0 
                    }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                    className={`flex items-center gap-3 py-2 ${
                      isCompleted || isActive ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-current">
                      {isCompleted ? (
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
                    {index === currentStep && !isCompleted && (
                      <motion.div
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <Clock className="h-4 w-4 text-accent" />
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-sm text-muted-foreground"
        >
          <p>Proces obvykle trvá 10-20 sekund</p>
          <p>Všechny dokumenty budou vygenerovány a odeslány na váš email</p>
        </motion.div>
      </div>
    </motion.div>
  );
}

