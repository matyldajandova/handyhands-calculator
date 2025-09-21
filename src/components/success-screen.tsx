"use client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Download, FileText, Building } from "lucide-react";
import { CalculationResult, FormConfig, FormSubmissionData } from "@/types/form-types";
import { isWinterMaintenancePeriod } from "@/utils/date-utils";
import * as Icons from "lucide-react";

interface SuccessScreenProps {
  onBackToServices: () => void;
  calculationResult: CalculationResult | null;
  formConfig: FormConfig | null;
  formData: FormSubmissionData;
}

export function SuccessScreen({ onBackToServices, calculationResult, formConfig, formData }: SuccessScreenProps) {
  const handleDownloadPDF = async () => {
    if (!calculationResult || !roundedResults || !formConfig) return;
    
    try {
      // Convert form data to OfferData format
      const { convertFormDataToOfferData } = await import("@/utils/form-to-offer-data");
      const offerData = convertFormDataToOfferData(formData, calculationResult, formConfig);
      
      // Generate PDF via API
      const response = await fetch('/api/pdf/offer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(offerData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cenova-nabidka-uklidovych-sluzeb-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Nepodařilo se vygenerovat PDF. Zkuste to prosím znovu.');
    }
  };

  // Format currency for display - round to whole 10 Kč (desetikoruny)
  const formatCurrency = (amount: number) => {
    const roundedAmount = Math.round(amount / 10) * 10; // Round to nearest 10 Kč
    return `${roundedAmount.toLocaleString('cs-CZ')} Kč`;
  };

  // Round calculation results to whole 10 Kč
  const roundedResults = calculationResult ? {
    regularCleaningPrice: Math.round(calculationResult.regularCleaningPrice / 10) * 10,
    generalCleaningPrice: calculationResult.generalCleaningPrice ? 
      Math.round(calculationResult.generalCleaningPrice / 10) * 10 : undefined,
    totalMonthlyPrice: Math.round(calculationResult.totalMonthlyPrice / 10) * 10
  } : null;

  if (!calculationResult || !roundedResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background p-4 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Chyba při načítání výsledků</h1>
          <p className="text-muted-foreground mb-6">Výsledky kalkulace nebyly nalezeny.</p>
          <Button onClick={onBackToServices} variant="outline">
            ← Zpět na výběr služby
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-background via-secondary to-background p-4 flex items-center justify-center"
    >
      <div className="w-full max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="flex justify-center mb-6"
        >
          <CheckCircle className="h-20 w-20 text-green-success" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground font-heading mb-4">
            Kalkulace dokončena!
          </h1>
          <p className="text-muted-foreground text-lg font-sans">
            Vaše cena úklidových služeb byla úspěšně vypočítána
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mb-8"
        >
          <Card className="bg-card border shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-center">
                <Building className="h-5 w-5 text-accent" />
                Výsledek kalkulace
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Main Price Display */}
              <div className="text-center">
                <div className="text-4xl font-bold text-accent mb-2">
                  {formatCurrency(roundedResults.totalMonthlyPrice)}
                </div>
                <div className="text-lg text-muted-foreground">
                  za měsíc
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  Cena za pravidelný úklid domu bez 21 % DPH
                </div>
              </div>

              {/* General Cleaning Price (if applicable) */}
              {roundedResults.generalCleaningPrice && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-2">
                      Generální úklid domu
                    </div>
                    <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                      {formatCurrency(roundedResults.generalCleaningPrice)}
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">
                      {calculationResult.generalCleaningFrequency} za provedený úklid
                    </div>
                  </div>
                </div>
              )}

              {/* Winter Service Fee (if applicable and in winter period) */}
              {calculationResult.winterServiceFee && isWinterMaintenancePeriod() && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950/20 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                      + Zimní údržba
                    </div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                      {formatCurrency(calculationResult.winterServiceFee)}
                    </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        měsíčně v období od {formConfig?.winterPeriod?.start.day}. {formConfig?.winterPeriod?.start.month}. do {formConfig?.winterPeriod?.end.day}. {formConfig?.winterPeriod?.end.month}. následujícího roku
                      </div>
                    <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      (tato položka platí pouze v zimních měsících)
                    </div>
                  </div>
                </div>
              )}
              
              {/* Conditions */}
              {formConfig?.conditions && formConfig.conditions.length > 0 && (
                <div className="p-4 bg-muted rounded-lg border">
                  <div className="text-left">
                    <h4 className="font-semibold text-foreground mb-2">
                      Podmínky uvedené ceny:
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {formConfig.conditions.map((condition, index) => (
                        <li key={index}>• {condition}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="space-y-4"
        >
          <Button
            onClick={handleDownloadPDF}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3"
          >
            <Download className="h-5 w-5 mr-2" />
            Stáhnout PDF kalkulaci
          </Button>
          
          <div className="text-sm text-muted-foreground">
            <FileText className="h-4 w-4 inline mr-1" />
            PDF obsahuje detailní rozpis ceny a specifikace služeb
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-12"
        >
          <Button
            onClick={onBackToServices}
            variant="ghost"
            
          >
            <Icons.ArrowLeft className="h-5 w-5" />
            Zpět na výběr služby
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
