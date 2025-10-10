"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UniversalForm } from "@/components/universal-form";
import { CalculatingScreen } from "@/components/calculating-screen";
import { getServiceIdFromSlug } from "@/utils/slug-mapping";
import { getServiceType } from "@/config/services";
import { FormSubmissionData, CalculationResult } from "@/types/form-types";
import { hashService } from "@/services/hash-service";
import { buildPoptavkaHashData } from "@/utils/hash-data-builder";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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
    const hashData = buildPoptavkaHashData({
      totalPrice: result.totalMonthlyPrice,
      calculationResult: result,
      formData: formData || {},
      formConfig,
      orderId: result.orderId // Preserve the order ID from calculation
    });
    
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


  // Show loading while checking service validity
  if (!serviceId || !service || !formConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <Image 
              src="/handyhands_horizontal.svg" 
              alt="HandyHands Logo" 
              width={200}
              height={80}
              className="h-12 md:h-16 w-auto"
              priority
            />
          </div>
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
        <div className="max-w-4xl mx-auto">
          {/* Logo and Back Button Row */}
          <div className="flex justify-between items-center mb-8">
            <Image 
              src="/handyhands_horizontal.svg" 
              alt="HandyHands Logo" 
              width={240}
              height={96}
              className="h-8 md:h-12 w-auto"
              priority
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleBackToHome}
              className="shadow-none bg-grey-100 hover:bg-grey-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Zpět na výběr služby
            </Button>
          </div>
          
          <UniversalForm
            config={formConfig}
            onBack={undefined}
            onSubmit={handleFormSubmit}
            onFormChange={handleFormChange}
            shouldResetForm={false}
          />
        </div>
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
