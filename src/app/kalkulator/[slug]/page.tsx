"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UniversalForm } from "@/components/universal-form";
import { CalculatingScreen } from "@/components/calculating-screen";
import { getServiceIdFromSlug } from "@/utils/slug-mapping";
import { getServiceType } from "@/config/services";
import { FormSubmissionData, CalculationResult } from "@/types/form-types";
import { hashService } from "@/services/hash-service";

type CalculatorState = "form" | "calculating";

export default function CalculatorPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  
  const [calculatorState, setCalculatorState] = useState<CalculatorState>("form");
  const [formData, setFormData] = useState<FormSubmissionData | null>(null);
  const [hasFormChanges, setHasFormChanges] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);

  // Get service ID from slug
  const serviceId = getServiceIdFromSlug(slug);
  const service = serviceId ? getServiceType(serviceId) : null;
  const formConfig = service?.formConfig;

  // Redirect to home if invalid slug
  useEffect(() => {
    if (!serviceId || !service || !formConfig) {
      router.push("/");
    }
  }, [serviceId, service, formConfig, router]);

  const handleFormSubmit = (data: FormSubmissionData) => {
    setFormData(data);
    setCalculatorState("calculating");
  };

  const handleCalculationComplete = (result: CalculationResult) => {
    // Generate hash for the result and redirect to /vysledek
    const hashData = {
      serviceType: formConfig?.id || 'Unknown Service',
      serviceTitle: formConfig?.title || 'Unknown Service',
      totalPrice: result.totalMonthlyPrice,
      currency: 'CZK',
      calculationData: {
        ...result,
        timestamp: Date.now(),
        price: result.totalMonthlyPrice,
        serviceTitle: formConfig?.title,
        formData: formData || {}
      }
    };
    
    const hash = hashService.generateHash(hashData);
    router.push(`/vysledek?hash=${hash}`);
  };

  const handleFormChange = () => {
    if (!hasFormChanges) {
      setHasFormChanges(true);
    }
  };

  const handleBackToHome = () => {
    if (hasFormChanges) {
      setShowWarningDialog(true);
    } else {
      router.push("/");
    }
  };

  const handleWarningDialogConfirm = () => {
    setShowWarningDialog(false);
    router.push("/");
  };

  const handleWarningDialogCancel = () => {
    setShowWarningDialog(false);
  };

  const handleBackToServices = () => {
    router.push("/");
  };

  // Show loading while checking service validity
  if (!serviceId || !service || !formConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background p-4 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Načítání...</h1>
        </div>
      </div>
    );
  }

  // Render appropriate screen based on calculator state
  if (calculatorState === "calculating") {
    return (
      <CalculatingScreen 
        onComplete={handleCalculationComplete}
        formData={formData || {}}
        formConfig={formConfig}
      />
    );
  }


  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background py-12 px-4">
        <UniversalForm
          config={formConfig}
          onBack={handleBackToHome}
          onSubmit={handleFormSubmit}
          onFormChange={handleFormChange}
          shouldResetForm={false}
        />
      </div>

      {/* Warning Dialog */}
      {showWarningDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Neuložené změny
            </h3>
            <p className="text-muted-foreground mb-6">
              Máte neuložené změny ve formuláři. Opravdu chcete odejít? Všechny vyplněné údaje budou ztraceny.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleWarningDialogCancel}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Zůstat
              </button>
              <button
                onClick={handleWarningDialogConfirm}
                className="px-4 py-2 text-sm font-medium text-destructive hover:text-destructive/90 transition-colors"
              >
                Odejít
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
