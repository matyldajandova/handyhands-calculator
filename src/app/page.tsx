"use client";
import { ServiceTypeSelector } from "@/components/service-type-selector";
import { UniversalForm } from "@/components/universal-form";
import { CalculatingScreen } from "@/components/calculating-screen";
import { SuccessScreen } from "@/components/success-screen";

import { useAppContext } from "@/app/providers";
import { Button } from "@/components/ui/button";

export default function Home() {
  const {
    appState,
    selectedService,
    formData,
    calculationResult,
    hasFormChanges,
    showWarningDialog,
    setShowWarningDialog,
    handleServiceTypeSelect,
    handleBackToServiceSelection,
    handleFormSubmit,
    handleCalculationComplete,
    handleFormChange,
    handleWarningDialogConfirm,
    handleWarningDialogCancel,
    handleBackButtonClick,
    getFormConfig,
  } = useAppContext();

  const formConfig = getFormConfig(selectedService);

  // Render appropriate screen based on app state
  if (appState === "calculating") {
    if (!formConfig) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background p-4 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Chyba při načítání konfigurace</h1>
            <p className="text-muted-foreground mb-6">Konfigurace formuláře nebyla nalezena.</p>
            <Button onClick={handleBackToServiceSelection} variant="outline">
              ← Zpět na výběr služby
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <CalculatingScreen 
        onComplete={handleCalculationComplete}
        formData={formData || {}}
        formConfig={formConfig}
      />
    );
  }

  if (appState === "success") {
    return (
      <SuccessScreen
        onBackToServices={handleBackToServiceSelection}
        serviceType={selectedService}
        calculationResult={calculationResult}
        formConfig={formConfig}
      />
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background py-12 px-4">
        {appState === "service-selection" ? (
          <ServiceTypeSelector onServiceTypeSelect={handleServiceTypeSelect} />
        ) : appState === "form" && formConfig ? (
          <UniversalForm
            config={formConfig}
            onBack={() => {
              if (hasFormChanges) {
                setShowWarningDialog(true);
              } else {
                handleBackToServiceSelection();
              }
            }}
            onSubmit={handleFormSubmit}
            onFormChange={handleFormChange}
            shouldResetForm={appState === "service-selection"}
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
