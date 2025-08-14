"use client";

import { useState } from "react";
import { ServiceTypeSelector } from "@/components/service-type-selector";
import { UniversalForm } from "@/components/universal-form";
import { CalculatingScreen } from "@/components/calculating-screen";
import { ThemeToggle } from "@/components/theme-toggle";
import { getFormConfig, getServiceType } from "@/config/services";

export default function Home() {
  const [selectedService, setSelectedService] = useState<string>("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [formData, setFormData] = useState<any>(null);

  const handleServiceTypeSelect = (serviceType: string) => {
    const service = getServiceType(serviceType);
    if (service && service.formConfig) {
      setSelectedService(serviceType);
    }
  };

  const handleBackToServiceSelection = () => {
    setSelectedService("");
    setIsCalculating(false);
    setFormData(null);
  };

  const handleFormSubmit = (data: any) => {
    setFormData(data);
    setIsCalculating(true);
  };

  const handleCalculationComplete = () => {
    // TODO: Navigate to results page or show results
    console.log("Calculation complete for:", formData);
    // For now, go back to service selection
    setTimeout(() => {
      handleBackToServiceSelection();
    }, 2000);
  };

  const formConfig = getFormConfig(selectedService);

  // Show calculating screen
  if (isCalculating) {
    return <CalculatingScreen onComplete={handleCalculationComplete} />;
  }

  return (
    <>
      <ThemeToggle />
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background px-4 py-12">
        {!selectedService ? (
          <ServiceTypeSelector onServiceTypeSelect={handleServiceTypeSelect} />
        ) : formConfig ? (
          <UniversalForm
            config={formConfig}
            onBack={handleBackToServiceSelection}
            onSubmit={handleFormSubmit}
          />
        ) : (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-foreground font-heading mb-4">
              Tato služba bude implementována brzy
            </h2>
            <p className="text-muted-foreground font-sans mb-6">
              Prozatím je k dispozici pouze kalkulátor pro činžovní domy a novostavby.
            </p>
            <button
              onClick={handleBackToServiceSelection}
              className="px-6 py-3 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg font-medium transition-colors"
            >
              Zpět na výběr služby
            </button>
          </div>
        )}
      </div>
    </>
  );
}
