"use client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Building, Plus, Sparkles, Snowflake, Info } from "lucide-react";
import { CalculationResult, FormConfig, FormSubmissionData } from "@/types/form-types";
import { isWinterMaintenancePeriod } from "@/utils/date-utils";
import { IdentificationStep } from "@/components/identification-step";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { hashService } from "@/services/hash-service";
import { orderStorage } from "@/services/order-storage";
import { buildPoptavkaHashData } from "@/utils/hash-data-builder";
import Image from "next/image";

interface SuccessScreenProps {
  onBackToServices: () => void;
  calculationResult: CalculationResult | null;
  formConfig: FormConfig | null;
  formData: FormSubmissionData;
}

export function SuccessScreen({ onBackToServices, calculationResult, formConfig, formData }: SuccessScreenProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
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
          formConfig,
          orderId: calculationResult.orderId
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

      // Get Google Drive URL from response headers
      const googleDriveUrl = response.headers.get('X-PDF-URL') || '';

      // Store customer data in Ecomail with PDF label
      try {
        await fetch('/api/ecomail/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...enhancedCustomerData,
            pdfUrl: googleDriveUrl // Store the Google Drive URL for reference
          }),
        });
      } catch (error) {
        console.error('Failed to store customer data in Ecomail:', error);
        // Don't show error to user as PDF download was successful
      }

      // Mark as downloaded successfully
      setIsDownloaded(true);

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
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background py-4 md:py-12 px-2 md:px-4">
      <div className="w-full max-w-2xl mx-auto">
        {/* Clickable Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-start items-center mb-8"
        >
          <button 
            onClick={onBackToServices}
            className="cursor-pointer transition-opacity hover:opacity-80"
          >
            <Image 
              src="/handyhands_horizontal.svg" 
              alt="HandyHands Logo" 
              width={160}
              height={64}
              className="h-10 md:h-12 w-auto"
              priority
            />
          </button>
        </motion.div>

        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex justify-center mb-6"
          >
            <CheckCircle className="h-14 w-14 md:h-20 md:w-20 text-green-success" />
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
            <CardHeader className="px-3 md:px-6">
              <CardTitle className="flex items-center gap-2 justify-center">
                <Building className="h-5 w-5 text-accent" />
                Výsledek kalkulace
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 px-3 md:px-6">
              {/* Main Price Display */}
              <div className="text-center">
                <div className="text-4xl font-bold text-accent mb-2">
                  {formatCurrency(roundedResults.totalMonthlyPrice)} <span className="font-normal text-muted-foreground">za měsíc</span>
                </div>
                <div className="text-base text-muted-foreground">
                  Cena za pravidelný úklid domu
                </div>
              </div>

              {/* General Cleaning Price (if applicable) */}
              {roundedResults.generalCleaningPrice && (
                <div className="p-4 bg-card dark:bg-card rounded-lg border border-border relative">
                  {/* Plus Icon */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-grey-800 dark:bg-slate-200 rounded-full p-1.5">
                    <Plus className="h-3 w-3 text-white dark:text-slate-800" strokeWidth={3} />
                  </div>
                  
                  <div className="text-center pt-2">
                    <div className="text-lg font-semibold text-foreground dark:text-slate-300 mb-2 flex items-center justify-center gap-2">
                      <Sparkles className="h-5 w-5 text-grey-500" />
                      Generální úklid domu
                    </div>
                    <div className="text-2xl font-bold text-foreground dark:text-slate-200">
                      {formatCurrency(roundedResults.generalCleaningPrice)}
                    </div>
                    <div className="text-sm text-muted-foreground dark:text-slate-400">
                      {calculationResult.generalCleaningFrequency} za každý provedený úklid
                    </div>
                  </div>
                </div>
              )}

              {/* Winter Service Fees (if applicable) */}
              {calculationResult.winterServiceFee && (
                <div className="p-4 bg-card dark:bg-card rounded-lg border border-border relative">
                  {/* Plus Icon */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-grey-800 dark:bg-slate-200 rounded-full p-1.5">
                    <Plus className="h-3 w-3 text-white dark:text-slate-800" strokeWidth={3} />
                  </div>
                  
                  <div className="text-center mb-3 pt-2">
                    <div className="text-lg font-semibold text-foreground dark:text-slate-300 flex items-center justify-center gap-2">
                      <Snowflake className="h-5 w-5 text-grey-500" />
                      Zimní údržba
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Standby Fee */}
                    <div className="text-center">
                      <div className="text-xl font-bold text-foreground dark:text-slate-200">
                        {formatCurrency(calculationResult.winterServiceFee)} měsíčně
                      </div>
                      <div className="text-sm text-muted-foreground dark:text-slate-400">
                        Pohotovost
                      </div>
                    </div>
                    
                    {/* Call-out Fee */}
                    {calculationResult.winterCalloutFee && (
                      <div className="text-center md:border-l border-border dark:border-slate-700">
                        <div className="text-xl font-bold text-foreground dark:text-slate-200">
                          {formatCurrency(calculationResult.winterCalloutFee)} za výjezd
                        </div>
                        <div className="text-sm text-muted-foreground dark:text-slate-400">
                          Cena za každý výjezd
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {!isWinterMaintenancePeriod() && (
                    <div className="text-sm text-muted-foreground dark:text-slate-500 mt-3 text-center italic">
                      Pohotovost se účtuje pouze v měsících od {formConfig?.winterPeriod?.start.day}. {formConfig?.winterPeriod?.start.month}. do {formConfig?.winterPeriod?.end.day}. {formConfig?.winterPeriod?.end.month}.
                    </div>
                  )}
                </div>
              )}
              
              {/* Conditions */}
              {formConfig?.conditions && formConfig.conditions.length > 0 && (
                <div className="p-4 bg-primary-light dark:bg-orange-950/20 rounded-lg border border-primary/30 dark:border-orange-800">
                  <div className="text-left">
                    <h4 className="font-semibold text-grey-900 dark:text-orange-200 mb-2 flex items-center gap-2">
                      <Info className="h-5 w-5 text-primary" />
                      Podmínky uvedené ceny:
                    </h4>
                    <ul className="text-sm text-grey-800 dark:text-orange-100 space-y-1">
                      {formConfig.conditions
                        .filter((condition) => {
                          // Hide general cleaning condition if not selected
                          if (condition.includes("pravidelný generální úklid") && formData.generalCleaning === "no") {
                            return false;
                          }
                          return true;
                        })
                        .map((condition, index) => (
                          <li key={index}>• {condition}</li>
                        ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* PDF Download Section */}
              <div className="pt-2">
                <IdentificationStep 
                  onDownloadPDF={handleDownloadPDF}
                  isDownloading={isDownloading}
                  isDownloaded={isDownloaded}
                  initialData={customerData || undefined}
                  onDataChange={handleFormDataChange}
                />
              </div>

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
              >
                Návrh smlouvy
              </Button>
            </CardContent>
          </Card>
        </motion.div>
        </div>
      </div>
    </div>
  );
}
