"use client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Building, Share } from "lucide-react";
import { CalculationResult, FormConfig, FormSubmissionData } from "@/types/form-types";
import { isWinterMaintenancePeriod } from "@/utils/date-utils";
import * as Icons from "lucide-react";
import { IdentificationStep } from "@/components/identification-step";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { hashService } from "@/services/hash-service";
import { orderStorage } from "@/services/order-storage";
import { buildPoptavkaHashData } from "@/utils/hash-data-builder";

interface SuccessScreenProps {
  onBackToServices: () => void;
  calculationResult: CalculationResult | null;
  formConfig: FormConfig | null;
  formData: FormSubmissionData;
}

export function SuccessScreen({ onBackToServices, calculationResult, formConfig, formData }: SuccessScreenProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [customerData, setCustomerData] = useState<{ firstName: string; lastName: string; email: string } | null>(null);
  const router = useRouter();

  // Load customer data from localStorage on mount
  useEffect(() => {
    const orderData = orderStorage.get();
    if (orderData?.customer) {
      setCustomerData(orderData.customer);
    }
  }, []);

  // Round calculation results to whole 10 Kč
  const roundedResults = useMemo(() => {
    return calculationResult ? {
      regularCleaningPrice: Math.round(calculationResult.regularCleaningPrice / 10) * 10,
      generalCleaningPrice: calculationResult.generalCleaningPrice ? 
        Math.round(calculationResult.generalCleaningPrice / 10) * 10 : undefined,
      totalMonthlyPrice: Math.round(calculationResult.totalMonthlyPrice / 10) * 10
    } : null;
  }, [calculationResult]);

  // Handle form data changes and update hash (with debouncing)
  const handleFormDataChange = useCallback((newCustomerData: { firstName: string; lastName: string; email: string }) => {
    setCustomerData(newCustomerData);
    
    // Save customer data to unified storage
    orderStorage.updateCustomer(newCustomerData);
    
    // Update hash after a short delay to avoid excessive updates
    setTimeout(() => {
      if (calculationResult && formConfig && roundedResults) {
        const orderData = orderStorage.get();
        const existingPoptavkaData = orderData?.poptavka || {};
        
        const enhancedFormData = {
          ...formData,
          ...existingPoptavkaData, // Preserve existing poptavka data (including notes)
          firstName: newCustomerData.firstName,
          lastName: newCustomerData.lastName,
          email: newCustomerData.email
        };
        
        const hashData = buildPoptavkaHashData({
          totalPrice: roundedResults.totalMonthlyPrice,
          calculationResult,
          formData: enhancedFormData,
          formConfig
        });
        
        const hash = hashService.generateHash(hashData);
        const newUrl = `/vysledek?hash=${hash}`;
        window.history.replaceState({}, '', newUrl);
      }
    }, 1000); // 1 second delay
  }, [calculationResult, formConfig, formData, roundedResults]);

  const handleDownloadPDF = async (customerData: { firstName: string; lastName: string; email: string }) => {
    if (!calculationResult || !roundedResults || !formConfig) return;
    
    // Store customer data for later use in "Závazná poptávka"
    setCustomerData(customerData);
    
    setIsDownloading(true);
    try {
      // Get existing poptavka form data to include in PDF hash
      const orderData = orderStorage.get();
      const existingPoptavkaData = orderData?.poptavka || {};
      
      // Merge customer data with existing poptavka data
      const enhancedCustomerData = {
        ...existingPoptavkaData,
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        email: customerData.email
      };
      
      // Convert form data to OfferData format with enhanced customer data
      const { convertFormDataToOfferData } = await import("@/utils/form-to-offer-data");
      const offerData = convertFormDataToOfferData(formData, calculationResult, formConfig, enhancedCustomerData);
      
      // Generate PDF via API
      const response = await fetch('/api/pdf/offer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(offerData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate PDF: ${response.status} ${errorText}`);
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

      // Note: We don't update the URL here anymore to avoid interfering with "Závazná poptávka" navigation
      // The customer data is stored in the component state and will be used when "Závazná poptávka" is clicked
    } catch {
      alert('Nepodařilo se vygenerovat PDF. Zkuste to prosím znovu.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Format currency for display - round to whole 10 Kč (desetikoruny)
  const formatCurrency = (amount: number) => {
    const roundedAmount = Math.round(amount / 10) * 10; // Round to nearest 10 Kč
    return `${roundedAmount.toLocaleString('cs-CZ')} Kč`;
  };

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
                  {formatCurrency(roundedResults.totalMonthlyPrice)} <span className="text-base font-normal text-muted-foreground">za měsíc</span>
                </div>
                <div className="text-sm text-muted-foreground">
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

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={() => {
                    // Generate a hash for sharing results
                    const hashData = {
                      serviceType: formConfig?.id || 'Ostatní služby',
                      serviceTitle: formConfig?.title || 'Ostatní služby',
                      totalPrice: roundedResults.totalMonthlyPrice,
                      currency: 'Kč',
                      calculationData: {
                        ...calculationResult, // Include the full calculation result
                        timestamp: Date.now(),
                        price: roundedResults.totalMonthlyPrice,
                        serviceTitle: formConfig?.title,
                        formData: formData
                      }
                    };
                    
                    const hash = hashService.generateHash(hashData);
                    const resultUrl = `/vysledek?hash=${hash}`;
                    
                    // Copy to clipboard
                    navigator.clipboard.writeText(window.location.origin + resultUrl).then(() => {
                      alert('Odkaz na výsledky byl zkopírován do schránky!');
                    }).catch(() => {
                      alert(`Odkaz na výsledky: ${window.location.origin}${resultUrl}`);
                    });
                  }}
                  variant="outline"
                  size="lg"
                  className=""
                >
                  <Share className="h-4 w-4" />
                  Sdílet výsledky
                </Button>
                
                <Button 
                  onClick={() => {
                    // Get customer data from state or unified storage
                    let currentCustomerData = customerData;
                    if (!currentCustomerData) {
                      const orderData = orderStorage.get();
                      currentCustomerData = orderData?.customer || null;
                    }
                    
                    // Get existing poptavka form data to preserve address/company info
                    const orderData = orderStorage.get();
                    const existingPoptavkaData = orderData?.poptavka || {};
                    
                    // Merge: existing poptavka data + calculation form data + updated customer data
                    const enhancedFormData = {
                      ...existingPoptavkaData, // Preserve address, company info, etc.
                      ...formData, // Original calculation form data
                      ...(currentCustomerData ? {
                        firstName: currentCustomerData.firstName || '',
                        lastName: currentCustomerData.lastName || '',
                        email: currentCustomerData.email || ''
                      } : {})
                    };

                    const hashData = buildPoptavkaHashData({
                      totalPrice: roundedResults.totalMonthlyPrice,
                      calculationResult,
                      formData: enhancedFormData,
                      formConfig
                    });
                    
                    // Use centralized hash service
                    hashService.navigateToPoptavka(hashData, router);
                  }}
                  size="lg"
                  className=""
                >
                  Závazná poptávka
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="space-y-4"
        >
          <IdentificationStep 
            onDownloadPDF={handleDownloadPDF}
            isDownloading={isDownloading}
            initialData={customerData || undefined}
            onDataChange={handleFormDataChange}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-8"
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
