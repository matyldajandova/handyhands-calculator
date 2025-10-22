"use client";

import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { hashService } from "@/services/hash-service";
import { orderStorage } from "@/services/order-storage";
import { hashSubmissionService } from "@/services/hash-submission-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { User, Building, Check, ShieldCheck, CalendarIcon, ArrowLeftIcon } from "lucide-react";
import { FormConfig, CalculationResult } from "@/types/form-types";
import { cn } from "@/lib/utils";
import { CalculationData } from "@/utils/hash-generator";

// Helper function to get minimum hours for hourly services
function getMinimumHours(formData: Record<string, unknown>): number {
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

// Helper function to get grouped addons for poptavka (matches success screen logic)
function getGroupedAddonsForPoptavka(calculationData: CalculationData) {
  const items: Array<{ label: string; amount: number }> = [];
  
  // Get fixed addons from applied coefficients
  const fixedAddons = calculationData.calculationDetails?.appliedCoefficients
    ?.filter(coeff => coeff.impact > 0 && coeff.coefficient === 1) || [];
  
  // Group addons by section
  const sectionMap = new Map<string, number>();
  let transportAmount = 0;
  
  for (const addon of fixedAddons) {
    // Special handling for transport/delivery
    if (addon.field === 'zipCode' || addon.label.includes('Doprava') || addon.label.includes('doprava')) {
      transportAmount = addon.impact;
    } else {
      // For poptavka, we need to find the section title from the form config
      // Since we don't have direct access to formConfig here, we'll use a simplified approach
      // and group by field type or use the label as is
      const sectionTitle = getSectionTitleFromField(addon.field);
      if (!sectionMap.has(sectionTitle)) {
        sectionMap.set(sectionTitle, 0);
      }
      sectionMap.set(sectionTitle, sectionMap.get(sectionTitle)! + addon.impact);
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

// Helper function to get section title from field ID
function getSectionTitleFromField(fieldId: string): string {
  const fieldToSectionMap: Record<string, string> = {
    'cleaningSupplies': 'Úklidové náčiní a úklidová chemie',
    'ladders': 'Úklidové náčiní a úklidová chemie',
    'zipCode': 'Doprava'
  };
  
  return fieldToSectionMap[fieldId] || fieldId;
}

interface FormData {
  // Personal information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // Property address
  propertyStreet: string;
  propertyCity: string;
  propertyZipCode: string;
  
  // Company information
  isCompany: boolean;
  companyName: string;
  companyIco: string;
  companyDic: string;
  
  // Company address
  companyStreet: string;
  companyCity: string;
  companyZipCode: string;
  
  // Service start date
  serviceStartDate: Date | null;
  
  // Invoice email (optional if different from contact email)
  invoiceEmail: string;
  
  // Additional notes
  notes: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  propertyStreet?: string;
  propertyCity?: string;
  propertyZipCode?: string;
  serviceStartDate?: string;
  isCompany?: string;
  companyName?: string;
  companyIco?: string;
  companyDic?: string;
  companyStreet?: string;
  companyCity?: string;
  companyZipCode?: string;
  invoiceEmail?: string;
  notes?: string;
}

function PoptavkaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    propertyStreet: "",
    propertyCity: "",
    propertyZipCode: "",
    isCompany: false,
    companyName: "",
    companyIco: "",
    companyDic: "",
    companyStreet: "",
    companyCity: "",
    companyZipCode: "",
    serviceStartDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    invoiceEmail: "",
    notes: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [hashData, setHashData] = useState<{
    serviceType: string;
    serviceTitle: string;
    totalPrice: number;
    currency: string;
    calculationData?: CalculationData;
  } | null>(null);

  // Load hash data on component mount
  useEffect(() => {
    const hash = searchParams.get('hash');
    
    if (hash) {
      // Use centralized hash service to decode the hash
      const decodedData = hashService.decodeHash(hash);
      
      if (decodedData) {
        // Check if this hash has already been submitted
        if (hashSubmissionService.isHashSubmitted(hash)) {
          setIsSubmitted(true);
          setIsLoading(false);
          return;
        }
        
        setHashData(decodedData);
        setIsLoading(false);
        
        // Prefill form data if available in hash
        if (decodedData.calculationData?.formData) {
          const hashFormData = decodedData.calculationData.formData as Record<string, unknown>;
          
          // Load existing order data first
          const orderData = orderStorage.get();
          const existingData = orderData?.poptavka || {};
          
          // Merge: customer data + existing poptavka data + hash data
          const customerData = orderData?.customer || {};
          const mergedData = {
            ...customerData, // Customer data (firstName, lastName, email)
            ...existingData, // Existing poptavka data
            ...hashFormData   // Hash data (takes precedence)
          } as Record<string, unknown>;
          
          // Always use 10 days from now for serviceStartDate unless it's explicitly in the hash data
          // (don't use old dates from localStorage)
          // IMPORTANT: Ensure the date is always at least 10 days from now
          const minDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
          
          const serviceStartDate = hashFormData.serviceStartDate 
            ? (() => {
                const dateStr = hashFormData.serviceStartDate as string;
                let parsedDate: Date;
                
                // Handle Czech date format (DD. MM. YYYY)
                if (dateStr.includes('. ')) {
                  const parts = dateStr.split('. ');
                  if (parts.length === 3) {
                    const day = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-based
                    const year = parseInt(parts[2], 10);
                    parsedDate = new Date(year, month, day);
                  } else {
                    parsedDate = minDate;
                  }
                }
                // Handle ISO date format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)
                else if (dateStr.includes('-')) {
                  const isoDate = dateStr.split('T')[0]; // Remove time part if present
                  const [year, month, day] = isoDate.split('-').map(Number);
                  parsedDate = new Date(Date.UTC(year, month - 1, day));
                }
                // Fallback to direct parsing
                else {
                  parsedDate = new Date(dateStr);
                }
                
                // Ensure date is at least 10 days from now
                if (parsedDate < minDate) {
                  parsedDate = minDate;
                }
                
                return parsedDate;
              })()
            : minDate;
          
          // Ensure all string fields are never undefined
          const safeFormData: FormData = {
            firstName: String(mergedData.firstName || ''),
            lastName: String(mergedData.lastName || ''),
            email: String(mergedData.email || ''),
            phone: String(mergedData.phone || ''),
            propertyStreet: String(mergedData.propertyStreet || ''),
            propertyCity: String(mergedData.propertyCity || ''),
            propertyZipCode: String(mergedData.propertyZipCode || ''),
            isCompany: Boolean(mergedData.isCompany || false),
            companyName: String(mergedData.companyName || ''),
            companyIco: String(mergedData.companyIco || ''),
            companyDic: String(mergedData.companyDic || ''),
            companyStreet: String(mergedData.companyStreet || ''),
            companyCity: String(mergedData.companyCity || ''),
            companyZipCode: String(mergedData.companyZipCode || ''),
            serviceStartDate: serviceStartDate,
            invoiceEmail: String(mergedData.invoiceEmail || ''),
            notes: String(mergedData.notes || ''),
          };
          
          setFormData(safeFormData);
        }
      } else {
        // Invalid hash, redirect to home
        window.location.href = '/';
      }
    } else {
      // No hash provided, redirect to home
      window.location.href = '/';
    }
  }, [searchParams]);


  // Simple persistence: Save form data to order storage and update hash
  useEffect(() => {
    // Don't save data if form is submitted
    if (isSubmitted) return;
    
    if (Object.keys(formData).length > 0) {
      // Split form data into customer and poptavka parts
      const { firstName, lastName, email, ...poptavkaData } = formData;
      
      // Save customer data and poptavka data separately
      orderStorage.updateCustomerAndPoptavka(
        { firstName, lastName, email },
        poptavkaData
      );
      
      // Update hash after delay to avoid excessive updates
      const timeoutId = setTimeout(() => {
        if (hashData) {
          const enhancedHashData = {
            ...hashData,
            calculationData: {
              ...(hashData.calculationData || {}),
                formData: {
                  ...(hashData.calculationData?.formData || {}),
                  // Preserve original notes, don't overwrite with poptavka notes
                  ...formData,
                  notes: hashData.calculationData?.formData?.notes || formData.notes
                },
              // Preserve the original order ID
              orderId: hashData.calculationData?.orderId
            } as CalculationData
          };
          
          const newHash = hashService.generateHash(enhancedHashData);
          const newUrl = `/poptavka?hash=${newHash}`;
          window.history.replaceState({}, '', newUrl);
        }
      }, 1000); // 1 second delay
      
      return () => clearTimeout(timeoutId);
    }
  }, [formData, hashData, isSubmitted]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = "Jméno je povinné";
    if (!formData.lastName.trim()) newErrors.lastName = "Příjmení je povinné";
    if (!formData.email.trim()) {
      newErrors.email = "E-mail je povinný";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Zadejte platný e-mail";
    }
    if (!formData.phone.trim()) newErrors.phone = "Telefon je povinný";
    if (!formData.propertyStreet.trim()) newErrors.propertyStreet = "Ulice je povinná";
    if (!formData.propertyCity.trim()) newErrors.propertyCity = "Město je povinné";
    if (!formData.propertyZipCode.trim()) newErrors.propertyZipCode = "PSČ je povinné";
    if (!formData.serviceStartDate) {
      newErrors.serviceStartDate = "Datum zahájení plnění je povinné";
    }

    if (formData.isCompany) {
      if (!formData.companyName.trim()) newErrors.companyName = "Název společnosti je povinný";
      if (!formData.companyIco.trim()) newErrors.companyIco = "IČO je povinné";
      if (!formData.companyStreet.trim()) newErrors.companyStreet = "Ulice je povinná";
      if (!formData.companyCity.trim()) newErrors.companyCity = "Město je povinné";
      if (!formData.companyZipCode.trim()) newErrors.companyZipCode = "PSČ je povinné";
    }

    // Validate invoice email if provided
    if (formData.invoiceEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.invoiceEmail)) {
      newErrors.invoiceEmail = "Zadejte platný e-mail pro faktury";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Get calculation data from hash to regenerate PDF with final data
      if (!hashData?.calculationData) {
        throw new Error('Calculation data not found. Please complete the calculation first.');
      }
      
      const calculationData = hashData.calculationData;
      const serviceType = hashData.serviceTitle || 'Ostatní služby';

      // Get the actual form configuration
      const { getFormConfig } = await import("@/config/services");
      const formConfig = getFormConfig(hashData.serviceType || serviceType);

      // Get the original calculation form data from hash
      const originalFormData = calculationData.formData as Record<string, string | number | boolean | string[] | undefined>;

      // Convert form data to OfferData format and generate PDF with final poptavka data
      const { convertFormDataToOfferData } = await import("@/utils/form-to-offer-data");
      const offerData = convertFormDataToOfferData(originalFormData, calculationData as unknown as CalculationResult, formConfig as unknown as FormConfig, {
        firstName: formData.firstName || '',
        lastName: formData.lastName || '',
        email: formData.email || '',
        // Add poptavka-specific data
        phone: formData.phone || '',
        address: `${formData.propertyStreet}, ${formData.propertyCity}, ${formData.propertyZipCode}`,
        company: formData.isCompany ? {
          name: formData.companyName || '',
          ico: formData.companyIco || '',
          dic: formData.companyDic || '',
          address: `${formData.companyStreet}, ${formData.companyCity}, ${formData.companyZipCode}`
        } : undefined,
        startDate: formData.serviceStartDate ? formData.serviceStartDate.toISOString().split('T')[0] : '',
        notes: formData.notes || '',
        invoiceEmail: formData.invoiceEmail || ''
      });
      
      // Mark as poptavka submission for Google Drive folder
      offerData.isPoptavka = true;

      const pdfResponse = await fetch('/api/pdf/offer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(offerData),
      });

      if (!pdfResponse.ok) {
        throw new Error('Failed to regenerate PDF with final data');
      }

      // Get the PDF URL from the response
      const pdfResult = await pdfResponse.json();
      const pdfUrl = pdfResult.pdfUrl || '';

      // Store customer data in Ecomail with Poptávka label
      const ecomailResponse = await fetch('/api/ecomail/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          pdfUrl
        }),
      });

      if (!ecomailResponse.ok) {
        console.error('Failed to store customer data in Ecomail');
        // Continue anyway as the main submission was successful
      }
      
      // Clear localStorage data first
      orderStorage.clear();
      
      // Reset form data to initial empty state
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        propertyStreet: '',
        propertyCity: '',
        propertyZipCode: '',
        isCompany: false,
        companyName: '',
        companyIco: '',
        companyDic: '',
        companyStreet: '',
        companyCity: '',
        companyZipCode: '',
        serviceStartDate: null,
        notes: '',
        invoiceEmail: ''
      });
      
      // Clear form errors
      setErrors({});
      
      // Mark this hash as submitted to prevent duplicate submissions
      const currentHash = searchParams.get('hash');
      if (currentHash) {
        hashSubmissionService.addSubmittedHash(currentHash);
      }
      
      // Show success state
      setIsSubmitted(true);
    } catch {
      alert("Nepodařilo se odeslat návrh smlouvy. Zkuste to prosím znovu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean | Date | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Format date for display in Czech format (dd.mm.rrrr)
  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleDateString("cs-CZ", {
      day: "2-digit",
      month: "2-digit", 
      year: "numeric"
    });
  };

  // Parse date from Czech format input
  const parseDate = (value: string) => {
    if (!value) return null;
    const parts = value.split(".");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  };

  // Check if date is valid and not in the past
  const isValidDate = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  // Show loading state while checking hash
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Načítání...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Brand Logo */}
            <div className="flex justify-center mb-8">
              <button 
                onClick={() => router.push('/')}
                className="cursor-pointer hover:opacity-80 transition-opacity"
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
            </div>
            
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <motion.div 
                  className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                  <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
                <motion.h1 
                  className="text-3xl font-bold text-foreground mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Poptávka byla úspěšně odeslána!
                </motion.h1>
                <motion.p 
                  className="text-lg text-muted-foreground mb-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  Děkujeme za Vaši poptávku. Brzy vás budeme kontaktovat s dalšími informacemi.
                </motion.p>
                <motion.div 
                  className="flex flex-col gap-4 justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <Button
                    onClick={() => window.location.href = '/'}
                    type="button"
                    variant="outline"
                    size="lg"
                    className="flex items-center gap-2 mx-auto"
                  >
                    <ArrowLeftIcon className="h-5 w-5" />
                    Zpět na hlavní stránku
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Logo and Back Button Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-between items-center mb-8"
        >
          <button 
            onClick={() => router.push('/')}
            className="cursor-pointer hover:opacity-80 transition-opacity"
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">Poptávka úklidových služeb</h1>
          <p className="text-muted-foreground text-lg max-w-lg">
            Abychom Vám mohli zaslat návrh smlouvy, budeme potřebovat od Vás několik údajů.
          </p>
        </motion.div>

        {/* Service Information Card (when loaded from hash) */}
        {hashData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="mb-4"
          >
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-black">
                  <Building className="h-5 w-5 text-primary" />
                  Poptáváte službu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Typ služby</h3>
                    <p className="text-muted-foreground">{hashData.serviceTitle}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Celková cena</h3>
                    {hashData.calculationData && (
                      <>
                        {/* Check if this is an hourly service */}
                        {(hashData.serviceType === "one-time-cleaning" || hashData.serviceType === "handyman-services") ? (
                          <div>
                            <p className="text-2xl font-bold text-primary">
                              {Math.round(hashData.calculationData.hourlyRate || hashData.totalPrice)} Kč <span className="font-normal text-muted-foreground">/hod/pracovník</span>
                            </p>
                            <p className="text-sm text-muted-foreground mt-1 italic">
                              Minimální délka {hashData.serviceType === "one-time-cleaning" ? "úklidu" : "mytí oken"} je {getMinimumHours(hashData.calculationData.formData || {})} hod. práce
                            </p>
                          </div>
                        ) : (
                          <p className="text-2xl font-bold text-primary">
                            {hashData.totalPrice.toLocaleString('cs-CZ')} Kč <span className="font-normal text-muted-foreground">za měsíc</span>
                          </p>
                        )}
                      </>
                    )}
                    {/* Additional services line items */}
                    {!!hashData.calculationData?.generalCleaningPrice && (
                      <p className="text-sm text-muted-foreground mt-1">
                        + {Math.round(hashData.calculationData.generalCleaningPrice / 10) * 10} Kč generální úklid ({hashData.calculationData.generalCleaningFrequency})
                      </p>
                    )}
                    {!!hashData.calculationData?.winterServiceFee && (
                      <p className="text-sm text-muted-foreground mt-1">
                        + {hashData.calculationData.winterServiceFee} Kč zimní údržba (měsíčně{' '}
                        {hashData.calculationData?.winterPeriod && 
                          `od ${hashData.calculationData.winterPeriod.start.day}.${hashData.calculationData.winterPeriod.start.month}. do ${hashData.calculationData.winterPeriod.end.day}.${hashData.calculationData.winterPeriod.end.month}.`
                        })
                        {!!hashData.calculationData?.winterCalloutFee && 
                          ` / ${hashData.calculationData.winterCalloutFee} Kč za výjezd`
                        }
                      </p>
                    )}
                    
                    {/* Extra položky line items for hourly services */}
                    {hashData.calculationData && (hashData.serviceType === "one-time-cleaning" || hashData.serviceType === "handyman-services") && 
                      getGroupedAddonsForPoptavka(hashData.calculationData).map((item, index) => (
                        <p key={index} className="text-sm text-muted-foreground mt-2">
                          + {item.label} ({item.amount} Kč)
                        </p>
                      ))
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Kontaktní údaje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Jméno</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName || ''}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                      placeholder="Vaše jméno"
                      className={errors.firstName ? "border-destructive" : ""}
                    />
                    {errors.firstName && (
                      <p className="text-sm text-destructive">{errors.firstName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Příjmení</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName || ''}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                      placeholder="Vaše příjmení"
                      className={errors.lastName ? "border-destructive" : ""}
                    />
                    {errors.lastName && (
                      <p className="text-sm text-destructive">{errors.lastName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="vas.email@example.com"
                      className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="+420 123 456 789"
                      className={errors.phone ? "border-destructive" : ""}
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone}</p>
                    )}
                  </div>
                </div>

                {/* Company Information */}
                <div className="">
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="isCompany"
                      checked={formData.isCompany}
                      onCheckedChange={(checked) => handleInputChange("isCompany", checked === true)}
                    />
                    <Label htmlFor="isCompany" className="flex items-center gap-2">
                      Objednávám služby jako společnost
                    </Label>
                  </div>

                  {formData.isCompany && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      {/* Company Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 space-y-2">
                          <Label htmlFor="companyName">Název společnosti</Label>
                          <Input
                            id="companyName"
                            value={formData.companyName || ''}
                            onChange={(e) => handleInputChange("companyName", e.target.value)}
                            placeholder="Název vaší společnosti"
                            className={errors.companyName ? "border-destructive" : ""}
                          />
                          {errors.companyName && (
                            <p className="text-sm text-destructive">{errors.companyName}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="companyIco">IČO</Label>
                          <Input
                            id="companyIco"
                            value={formData.companyIco || ''}
                            onChange={(e) => handleInputChange("companyIco", e.target.value)}
                            placeholder="12345678"
                            className={errors.companyIco ? "border-destructive" : ""}
                          />
                          {errors.companyIco && (
                            <p className="text-sm text-destructive">{errors.companyIco}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="companyDic">DIČ <span className="text-muted-foreground font-normal">(volitelné)</span></Label>
                          <Input
                            id="companyDic"
                            value={formData.companyDic || ''}
                            onChange={(e) => handleInputChange("companyDic", e.target.value)}
                            placeholder="CZ12345678"
                          />
                        </div>
                      </div>

                      {/* Company Address */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">Adresa společnosti</h3>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="companyStreet">Ulice a číslo popisné</Label>
                            <Input
                              id="companyStreet"
                              value={formData.companyStreet || ''}
                              onChange={(e) => handleInputChange("companyStreet", e.target.value)}
                              placeholder="Např. Václavské náměstí 123"
                              className={errors.companyStreet ? "border-destructive" : ""}
                            />
                            {errors.companyStreet && (
                              <p className="text-sm text-destructive">{errors.companyStreet}</p>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="companyCity">Město</Label>
                              <Input
                                id="companyCity"
                                value={formData.companyCity || ''}
                                onChange={(e) => handleInputChange("companyCity", e.target.value)}
                                placeholder="Praha"
                                className={errors.companyCity ? "border-destructive" : ""}
                              />
                              {errors.companyCity && (
                                <p className="text-sm text-destructive">{errors.companyCity}</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="companyZipCode">PSČ</Label>
                              <Input
                                id="companyZipCode"
                                value={formData.companyZipCode || ''}
                                onChange={(e) => handleInputChange("companyZipCode", e.target.value)}
                                placeholder="110 00"
                                className={errors.companyZipCode ? "border-destructive" : ""}
                              />
                              {errors.companyZipCode && (
                                <p className="text-sm text-destructive">{errors.companyZipCode}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Property Address */}
                <div className="space-y-4 pt-6 border-t pb-6 border-b">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Adresa nemovitosti, kde bude probíhat úklid</h3>
                  </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="propertyStreet">Ulice a číslo popisné</Label>
                        <Input
                          id="propertyStreet"
                          value={formData.propertyStreet || ''}
                          onChange={(e) => handleInputChange("propertyStreet", e.target.value)}
                          placeholder="Např. Václavské náměstí 123"
                          className={errors.propertyStreet ? "border-destructive" : ""}
                        />
                        {errors.propertyStreet && (
                          <p className="text-sm text-destructive">{errors.propertyStreet}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="propertyCity">Město</Label>
                          <Input
                            id="propertyCity"
                            value={formData.propertyCity || ''}
                            onChange={(e) => handleInputChange("propertyCity", e.target.value)}
                            placeholder="Praha"
                            className={errors.propertyCity ? "border-destructive" : ""}
                          />
                          {errors.propertyCity && (
                            <p className="text-sm text-destructive">{errors.propertyCity}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="propertyZipCode">PSČ</Label>
                          <Input
                            id="propertyZipCode"
                            value={formData.propertyZipCode || ''}
                            onChange={(e) => handleInputChange("propertyZipCode", e.target.value)}
                            placeholder="110 00"
                            className={errors.propertyZipCode ? "border-destructive" : ""}
                          />
                          {errors.propertyZipCode && (
                            <p className="text-sm text-destructive">{errors.propertyZipCode}</p>
                          )}
                        </div>
                      </div>
                    </div>
                </div>


                {/* Service Start Date */}
                <div className="space-y-2 max-w-1/3">
                  <Label htmlFor="serviceStartDate">
                    Zahájení plnění je dnem
                  </Label>
                  <div className="relative">
                    <Input
                      id="serviceStartDate"
                      value={formatDate(formData.serviceStartDate)}
                      placeholder="dd.mm.rrrr"
                      className={cn(
                        "pr-10",
                        errors.serviceStartDate ? "border-destructive" : ""
                      )}
                      onChange={(e) => {
                        const date = parseDate(e.target.value);
                        if (date && isValidDate(date)) {
                          handleInputChange("serviceStartDate", date);
                        } else if (e.target.value === "") {
                          handleInputChange("serviceStartDate", null);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setDatePickerOpen(true);
                        }
                      }}
                    />
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className="absolute top-1/2 right-2 size-6 -translate-y-1/2 p-0"
                        >
                          <CalendarIcon className="size-3.5" />
                          <span className="sr-only">Vybrat datum</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={formData.serviceStartDate || undefined}
                          onSelect={(date) => {
                            if (date && isValidDate(date)) {
                              handleInputChange("serviceStartDate", date);
                              setDatePickerOpen(false);
                            }
                          }}
                          disabled={(date) => {
                            const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
                            tenDaysFromNow.setHours(0, 0, 0, 0);
                            return date < tenDaysFromNow;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  {errors.serviceStartDate && (
                    <p className="text-sm text-destructive">{errors.serviceStartDate}</p>
                  )}
                </div>

                {/* Invoice Email */}
                <div className="space-y-2 mt-6">
                  <Label htmlFor="invoiceEmail">
                    Email, kam mají být zasílány faktury <span className="text-muted-foreground">(volitelné)</span>
                  </Label>
                  <Input
                    id="invoiceEmail"
                    type="email"
                    value={formData.invoiceEmail || ''}
                    onChange={(e) => handleInputChange("invoiceEmail", e.target.value)}
                    placeholder="faktury@example.com"
                    className={errors.invoiceEmail ? "border-destructive" : ""}
                  />
                  <p className="text-sm text-muted-foreground">
                    Pokud není uvedeno, budou faktury zasílány na email uvedený v kontaktních údajích
                  </p>
                  {errors.invoiceEmail && (
                    <p className="text-sm text-destructive">{errors.invoiceEmail}</p>
                  )}
                </div>

                {/* Additional Notes */}
                <div className="space-y-2 mt-6">
                  <Label htmlFor="notes">
                    Poznámka <span className="text-muted-foreground">(volitelné)</span>
                  </Label>
                  <Textarea
                    id="notes"
                    value={formData.notes || ''}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder="např. jméno jednatele/jednatelky společnosti"
                    rows={4}
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-center pt-4">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className="px-8 py-3"
                  >
                    {isSubmitting ? (
                      "Odesílám..."
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Odeslat návrh smlouvy
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Additional Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-6 text-center text-sm text-muted-foreground"
        >
          <p className="flex items-center justify-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Vaše údaje jsou chráněny a používáme je pouze pro zpracování Vaší poptávky.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function PoptavkaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background p-4 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-8">
            <Link href="/" className="cursor-pointer hover:opacity-80 transition-opacity inline-block">
              <Image
                src="/handyhands_horizontal.svg"
                alt="HandyHands"
                width={300}
                height={90}
                style={{ height: 'auto' }}
                className="mx-auto"
                priority
              />
            </Link>
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Načítání...</h1>
        </div>
      </div>
    }>
      <PoptavkaContent />
    </Suspense>
  );
}
