"use client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Building, Plus, Sparkles, Snowflake, Info } from "lucide-react";
import { CalculationResult, FormConfig, FormSubmissionData } from "@/types/form-types";
import { isWinterMaintenancePeriod } from "@/utils/date-utils";
import { reconstructCalculationDetails } from "@/utils/calculation-reconstruction";
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

// Helper function to get price description based on form type
function getPriceDescription(formConfig: FormConfig | null): string {
  if (!formConfig) return "Cena za pravidelný úklid domu";
  
  const descriptions: Record<string, string> = {
    "commercial-spaces": "Cena za pravidelný úklid komerčních nebytových (retailových) prostor",
    "residential-building": "Cena za pravidelný úklid činžovního domu",
    "panel-building": "Cena za pravidelný úklid panelového domu",
    "home-cleaning": "Cena za pravidelný úklid domácnosti",
    "office-cleaning": "Cena za pravidelný úklid kanceláří",
  };
  
  return descriptions[formConfig.id] || "Cena za pravidelný úklid";
}

// Helper function to get minimum hours for hourly services
function getMinimumHours(formData: FormSubmissionData): number {
  // For one-time cleaning
  if (formData.spaceArea) {
    const areaHours: Record<string, number> = {
      "up-to-30": 3,
      "up-to-50": 3.5,
      "50-75": 4,
      "75-100": 4,
      "100-125": 4,
      "125-200": 4,
      "200-plus": 4
    };
    return areaHours[formData.spaceArea as string] || 4;
  }
  
  // For handyman services (window cleaning)
  if (formData.roomCount) {
    const roomHours: Record<string, number> = {
      "up-to-2": 2,
      "3": 2,
      "4": 3,
      "5-plus": 4
    };
    return roomHours[formData.roomCount as string] || 2;
  }
  
  return 4; // Default
}

// Helper function to get individual addon items grouped by section
function getIndividualAddons(formData: FormSubmissionData, formConfig: FormConfig | null, calculationResult: CalculationResult) {
  if (!formConfig) return [];
  
  const items: Array<{ label: string; amount: number }> = [];
  
  // Reconstruct calculationDetails if missing (for optimized hashes)
  let calculationDetails = calculationResult.calculationDetails;
  if (!calculationDetails?.appliedCoefficients || calculationDetails.appliedCoefficients.length === 0) {
    calculationDetails = reconstructCalculationDetails(formData, formConfig, calculationResult);
  }
  
  // Get fixed addons from applied coefficients
  const fixedAddons = calculationDetails.appliedCoefficients
    .filter(coeff => coeff.impact > 0 && coeff.coefficient === 1);
  
  // Group addons by section
  const sectionMap = new Map<string, number>();
  let transportAmount = 0;
  
  for (const addon of fixedAddons) {
    // Special handling for transport/delivery
    if (addon.field === 'zipCode' || addon.label.includes('Doprava') || addon.label.includes('doprava')) {
      transportAmount = addon.impact;
    } else {
      // Find the section title for this field
      const section = formConfig.sections.find(section => 
        section.fields.some(field => field.id === addon.field)
      );
      
      if (section) {
        const sectionTitle = section.title;
        if (!sectionMap.has(sectionTitle)) {
          sectionMap.set(sectionTitle, 0);
        }
        sectionMap.set(sectionTitle, sectionMap.get(sectionTitle)! + addon.impact);
      }
    }
  }
  
  // Convert grouped sections to items
  for (const [title, totalAmount] of sectionMap) {
    items.push({
      label: title,
      amount: totalAmount
    });
  }
  
  // Add transport at the end
  if (transportAmount > 0) {
    items.push({
      label: 'Doprava',
      amount: transportAmount
    });
  }
  
  return items;
}

export function SuccessScreen({ onBackToServices, calculationResult, formConfig, formData }: SuccessScreenProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [customerData, setCustomerData] = useState<{ firstName: string; lastName: string; email: string } | null>(null);
  const router = useRouter();

  // Load customer data from localStorage on mount and check for new order
  useEffect(() => {
    const orderData = orderStorage.get();
    if (orderData?.customer) {
      setCustomerData(orderData.customer);
    }
    // Clear poptavka notes if this is a new order
    if (calculationResult?.orderId) {
      orderStorage.checkAndClearNotesForNewOrder(calculationResult.orderId);
    }
  }, [calculationResult?.orderId ?? null]);

  // Round calculation results to whole 10 Kč (or whole crowns for hourly services)
  const roundedResults = useMemo(() => {
    if (!calculationResult) return null;
    
    const isHourlyService = formConfig?.id === "one-time-cleaning" || formConfig?.id === "handyman-services";
    
    if (isHourlyService) {
      // For hourly services, round to whole crowns
      return {
        regularCleaningPrice: Math.round(calculationResult.regularCleaningPrice),
        generalCleaningPrice: calculationResult.generalCleaningPrice ? 
          Math.round(calculationResult.generalCleaningPrice) : undefined,
        totalMonthlyPrice: Math.round(calculationResult.totalMonthlyPrice), // This is actually hourly rate
        hourlyRate: Math.round(calculationResult.hourlyRate || calculationResult.totalMonthlyPrice)
      };
    } else {
      // For other services, round to whole 10 Kč
      return {
        regularCleaningPrice: Math.round(calculationResult.regularCleaningPrice / 10) * 10,
        generalCleaningPrice: calculationResult.generalCleaningPrice ? 
          Math.round(calculationResult.generalCleaningPrice / 10) * 10 : undefined,
        totalMonthlyPrice: Math.round(calculationResult.totalMonthlyPrice / 10) * 10
      };
    }
  }, [calculationResult, formConfig]);

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
        
        // Exclude notes and serviceStartDate from existing poptavka data to prevent leakage between orders
        // CRITICAL: Only exclude poptavka notes from existingPoptavkaData, NOT form notes from formData!
        // IMPORTANT: Also exclude firstName, lastName, email, phone to prevent hash expansion issues
        // These should always come from newCustomerData (user input), not from existingPoptavkaData
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { notes: _oldNotes, serviceStartDate: _oldDate, firstName: _oldFirstName, lastName: _oldLastName, email: _oldEmail, phone: _oldPhone, ...existingPoptavkaDataClean } = existingPoptavkaData as Record<string, unknown>;
        // DO NOT exclude notes from formData - form notes must be preserved in the hash!

        const enhancedFormData = {
          ...formData, // Keep form notes - they belong in the hash!
          ...existingPoptavkaDataClean, // This excludes poptavka notes, firstName, lastName, email, phone, which is correct
          // CRITICAL: Explicitly set firstName, lastName, email from newCustomerData to prevent hash expansion issues
          firstName: newCustomerData.firstName,
          lastName: newCustomerData.lastName,
          email: newCustomerData.email
        } as typeof formData;
        
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
      const existingPoptavkaData = (orderData?.poptavka || {}) as Record<string, unknown>;
      
      // IMPORTANT: Exclude serviceStartDate and notes from existingPoptavkaData - they should never persist between orders
      // Notes are stored in hash only, never in localStorage
      // IMPORTANT: Also exclude firstName, lastName, email, phone to prevent hash expansion issues
      // These should always come from the current customerData, not from localStorage
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { serviceStartDate: _, startDate: ___, notes: __notes, firstName: ___firstName, lastName: ___lastName, email: ___email, phone: ___phone, ...existingPoptavkaDataClean } = existingPoptavkaData;
      // Extract form notes and poptavkaNotes BEFORE excluding them
      const formNotes = typeof formData.notes === 'string' ? formData.notes : undefined;
      const poptavkaNotes = typeof (formData as Record<string, unknown>).poptavkaNotes === 'string' 
        ? (formData as Record<string, unknown>).poptavkaNotes as string 
        : undefined;
      
      // Extract serviceStartDate from formData BEFORE excluding it
      // It should be in the hash and only changed if it doesn't meet minimum requirements
      const serviceStartDateFromHash = (formData as Record<string, unknown>).serviceStartDate;
      
      // Exclude notes, poptavkaNotes, and serviceStartDate from formData (we'll add form notes back, poptavkaNotes goes to customerData, serviceStartDate goes to customerData)
      // IMPORTANT: Also exclude firstName, lastName, email, phone to prevent hash expansion issues
      // These should always come from the customerData parameter, not from formData
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { serviceStartDate: __, notes: _formNotes, poptavkaNotes: _poptavkaNotes, firstName: _firstName, lastName: _lastName, email: _email, phone: _phone, ...formDataWithoutDateAndNotes } = formData;
      
      // Merge customer data with existing poptavka data (without old dates and notes)
      // CRITICAL: Do NOT spread formData notes into enhancedCustomerData - that would make it a poptavka note!
      // CRITICAL: firstName, lastName, email, phone are set FIRST to ensure they're never overwritten by hash data
      const enhancedCustomerData = {
        ...existingPoptavkaDataClean, // Preserve address, company info, etc. (without date and notes)
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        email: customerData.email,
        // Include calculationResult and formConfig to preserve appliedCoefficients and form data
        calculationResult: calculationResult,
        formConfig: formConfig,
        serviceType: formConfig.id,
        // Include original formData fields (cleaningSupplies, zipCode, etc.) for hash generation (without date, notes, firstName, lastName, email, phone)
        ...formDataWithoutDateAndNotes,
        // Pass poptavkaNotes if it exists in the hash
        ...(poptavkaNotes ? { notes: poptavkaNotes } : {}),
        // Pass serviceStartDate from hash if it exists (convertFormDataToOfferData will validate it meets minimum requirements)
        ...(serviceStartDateFromHash ? { startDate: typeof serviceStartDateFromHash === 'string' ? serviceStartDateFromHash : String(serviceStartDateFromHash) } : {})
        // Note: convertFormDataToOfferData will ensure date meets minimum requirements (+1 day for hourly, +10 days for regular)
        // Note: Do NOT include form notes here - they will be passed separately via formData
      };
      
      // Ensure formData has the form notes (from calculation form)
      const formDataWithNotes = {
        ...formDataWithoutDateAndNotes,
        notes: formNotes // Preserve original form notes
      };
      
      // Convert form data to OfferData format with enhanced customer data
      // IMPORTANT: Pass formDataWithNotes to ensure form notes are included
      // Do NOT pass poptavka notes in customerData - they should only come from /poptavka page
      const { convertFormDataToOfferData } = await import("@/utils/form-to-offer-data");
      const offerData = convertFormDataToOfferData(formDataWithNotes, calculationResult, formConfig, enhancedCustomerData);
      
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

  // Format currency for display - round to whole 10 Kč (desetikoruny) for regular services, whole crowns for hourly services
  const formatCurrency = (amount: number) => {
    const isHourlyService = formConfig?.id === "one-time-cleaning" || formConfig?.id === "handyman-services";
    
    if (isHourlyService) {
      // For hourly services, round to whole crowns
      const roundedAmount = Math.round(amount);
      return `${roundedAmount.toLocaleString('cs-CZ')} Kč`;
    } else {
      // For regular services, round to nearest 10 Kč
      const roundedAmount = Math.round(amount / 10) * 10;
      return `${roundedAmount.toLocaleString('cs-CZ')} Kč`;
    }
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
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background pt-4 pb-12 md:py-12 px-4">
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
                {formConfig?.id === "one-time-cleaning" || formConfig?.id === "handyman-services" ? (
                  // Hourly services display
                  <div>
                    <div className="text-4xl font-bold text-accent mb-2">
                      {roundedResults.hourlyRate} Kč <span className="font-normal text-muted-foreground">/hod/pracovník</span>
                    </div>
                    <div className="text-muted-foreground mt-2 italic">
                      Minimální délka {formConfig?.id === "one-time-cleaning" ? "úklidu" : "mytí oken"} je {getMinimumHours(formData)} hod. práce
                    </div>
                  </div>
                ) : (
                  // Regular services display
                  <div>
                    <div className="text-4xl font-bold text-accent mb-2">
                      {formatCurrency(roundedResults.totalMonthlyPrice)} <span className="font-normal text-muted-foreground">za měsíc</span>
                    </div>
                    <div className="text-base text-muted-foreground">
                      {getPriceDescription(formConfig)}
                    </div>
                  </div>
                )}
              </div>

              {/* Hourly Services Extra Items */}
              {(formConfig?.id === "one-time-cleaning" || formConfig?.id === "handyman-services") && (
                <div className="p-4 bg-card dark:bg-card rounded-lg border border-border relative">
                  {/* Plus Icon */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-grey-800 dark:bg-slate-200 rounded-full p-1.5">
                    <Plus className="h-3 w-3 text-white dark:text-slate-800" strokeWidth={3} />
                  </div>
                  
                  <div className="text-center pt-2">
                    <div className="text-lg font-semibold text-foreground dark:text-slate-300 mb-3 flex items-center justify-center gap-2">
                      <CheckCircle className="h-5 w-5 text-grey-500" />
                      Extra položky
                    </div>
                    
                    {/* Show individual addon items */}
                    {getIndividualAddons(formData, formConfig, calculationResult).map((item, index) => (
                      <div key={index} className="text-sm text-muted-foreground dark:text-slate-400 mb-1">
                        {item.label} ({item.amount} Kč)
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                          Cena je včetně posypového materiálu
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
                  if (!formConfig) return; // Guard against null formConfig
                  
                  // Get customer data from state or unified storage
                  let currentCustomerData = customerData;
                  if (!currentCustomerData) {
                    const orderData = orderStorage.get();
                    currentCustomerData = orderData?.customer || null;
                  }
                  
                  // Get existing poptavka form data to preserve address/company info
                  const orderData = orderStorage.get();
                  const existingPoptavkaData = (orderData?.poptavka || {}) as Record<string, unknown>;
                  
                  // Calculate start date (same logic as convertFormDataToOfferData)
                  const isHourlyService = formConfig.id === "one-time-cleaning" || formConfig.id === "handyman-services";
                  const daysDelay = isHourlyService ? 1 : 10;
                  const minDate = new Date(Date.now() + daysDelay * 24 * 60 * 60 * 1000);
                  minDate.setHours(0, 0, 0, 0);
                  
                  // Calculate start date in ISO format (YYYY-MM-DD) for hash - use local date to avoid timezone shifts
                  const y = minDate.getFullYear();
                  const m = String(minDate.getMonth() + 1).padStart(2, '0');
                  const d = String(minDate.getDate()).padStart(2, '0');
                  const startDateISO = `${y}-${m}-${d}`;
                  
                  // Merge: existing poptavka data + calculation form data + updated customer data
                  // IMPORTANT: Exclude serviceStartDate from both existingPoptavkaData and formData - dates should never persist between orders
                  // Also extract poptavkaNotes separately to preserve it correctly
                  const poptavkaNotesFromHash = typeof (formData as Record<string, unknown>).poptavkaNotes === 'string' 
                    ? (formData as Record<string, unknown>).poptavkaNotes as string 
                    : undefined;
                  // Try to get form notes from formData first (from hash), then from calculationResult.formData (original)
                  const formNotesFromHash = typeof formData.notes === 'string' ? formData.notes : undefined;
                  const formNotesFromCalculation = typeof (calculationResult.formData as Record<string, unknown> | undefined)?.notes === 'string'
                    ? (calculationResult.formData as Record<string, unknown>).notes as string
                    : undefined;
                  const formNotes = formNotesFromHash || formNotesFromCalculation;
                  
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { serviceStartDate: _, ...existingPoptavkaDataWithoutDate } = existingPoptavkaData;
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { serviceStartDate: __, notes: _formNotes, poptavkaNotes: _poptavkaNotes, ...formDataWithoutDateAndNotes } = formData;
                  const enhancedFormData = {
                    ...existingPoptavkaDataWithoutDate, // Preserve address, company info, etc. (without date)
                    ...formDataWithoutDateAndNotes, // Original calculation form data (without date, notes, poptavkaNotes)
                    serviceStartDate: startDateISO, // Always use freshly calculated start date
                    // Preserve form notes and poptavkaNotes separately
                    ...(formNotes ? { notes: formNotes } : {}),
                    ...(poptavkaNotesFromHash ? { poptavkaNotes: poptavkaNotesFromHash } : {}),
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
