"use client";

import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { hashService } from "@/services/hash-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { User, Building, Check } from "lucide-react";

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
  
  // Additional notes
  notes: string;
}

function PoptavkaContent() {
  const searchParams = useSearchParams();
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
    notes: "",
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hashData, setHashData] = useState<{
    serviceType: string;
    serviceTitle: string;
    totalPrice: number;
    currency: string;
    calculationData?: Record<string, unknown>;
  } | null>(null);

  // Load hash data on component mount
  useEffect(() => {
    const hash = searchParams.get('hash');
    console.log('URL search params:', Object.fromEntries(searchParams.entries()));
    console.log('Hash from URL:', hash);
    
    if (hash) {
      console.log('Decoding reversible hash:', hash);
      
      // Use centralized hash service to decode the hash
      const decodedData = hashService.decodeHash(hash);
      
      if (decodedData) {
        console.log('Successfully decoded hash data:', decodedData);
        setHashData(decodedData);
        
        // Prefill form data if available in hash
        if (decodedData.calculationData?.formData) {
          const hashFormData = decodedData.calculationData.formData as Record<string, unknown>;
          
          // Load existing localStorage data first
          let existingData = {};
          try {
            const savedData = localStorage.getItem('poptavka-form-data');
            if (savedData) {
              existingData = JSON.parse(savedData);
              console.log('Loading existing localStorage data:', existingData);
            }
          } catch (error) {
            console.error('Failed to parse existing data:', error);
          }
          
          console.log('Hash form data:', hashFormData);
          
          // Merge: localStorage data + hash data
          const mergedData = {
            ...existingData,
            ...hashFormData
          } as Record<string, unknown>;
          
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
            notes: String(mergedData.notes || ''),
          };
          
          console.log('Merged form data:', safeFormData);
          setFormData(safeFormData);
        }
      } else {
        console.error('Failed to decode hash data');
      }
    }
  }, [searchParams]);

  // Load from localStorage on component mount (separate from hash loading)
  useEffect(() => {
    // Only load localStorage if there's no hash in URL
    const hash = searchParams.get('hash');
    if (!hash) {
      const savedData = localStorage.getItem('poptavka-form-data');
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          console.log('Loading form data from localStorage:', parsedData);
          
          // Ensure all string fields are never undefined
          const safeFormData: FormData = {
            firstName: String(parsedData.firstName || ''),
            lastName: String(parsedData.lastName || ''),
            email: String(parsedData.email || ''),
            phone: String(parsedData.phone || ''),
            propertyStreet: String(parsedData.propertyStreet || ''),
            propertyCity: String(parsedData.propertyCity || ''),
            propertyZipCode: String(parsedData.propertyZipCode || ''),
            isCompany: Boolean(parsedData.isCompany || false),
            companyName: String(parsedData.companyName || ''),
            companyIco: String(parsedData.companyIco || ''),
            companyDic: String(parsedData.companyDic || ''),
            companyStreet: String(parsedData.companyStreet || ''),
            companyCity: String(parsedData.companyCity || ''),
            companyZipCode: String(parsedData.companyZipCode || ''),
            notes: String(parsedData.notes || ''),
          };
          
          setFormData(safeFormData);
        } catch (error) {
          console.error('Failed to parse saved form data:', error);
        }
      }
    }
  }, [searchParams]); // Run when searchParams change

  // Simple persistence: Save form data to localStorage and update hash
  useEffect(() => {
    if (Object.keys(formData).length > 0) {
      // Save to localStorage for persistence
      console.log('Saving form data to localStorage:', formData);
      localStorage.setItem('poptavka-form-data', JSON.stringify(formData));
      
      // Also save customer data for success screen
      if (formData.firstName || formData.lastName || formData.email) {
        const customerData = {
          firstName: formData.firstName || '',
          lastName: formData.lastName || '',
          email: formData.email || ''
        };
        localStorage.setItem('success-screen-customer-data', JSON.stringify(customerData));
      }
      
      // Update hash after delay to avoid excessive updates
      const timeoutId = setTimeout(() => {
        if (hashData) {
          const enhancedHashData = {
            ...hashData,
            calculationData: {
              ...(hashData.calculationData || {}),
              formData: {
                ...(hashData.calculationData?.formData || {}),
                ...formData
              }
            }
          };
          
          const newHash = hashService.generateHash(enhancedHashData);
          const newUrl = `/poptavka?hash=${newHash}`;
          window.history.replaceState({}, '', newUrl);
        }
      }, 1000); // 1 second delay
      
      return () => clearTimeout(timeoutId);
    }
  }, [formData, hashData]);

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

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

    if (formData.isCompany) {
      if (!formData.companyName.trim()) newErrors.companyName = "Název firmy je povinný";
      if (!formData.companyIco.trim()) newErrors.companyIco = "IČO je povinné";
      if (!formData.companyStreet.trim()) newErrors.companyStreet = "Ulice je povinná";
      if (!formData.companyCity.trim()) newErrors.companyCity = "Město je povinné";
      if (!formData.companyZipCode.trim()) newErrors.companyZipCode = "PSČ je povinné";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // TODO: Implement form submission to your backend/email service
      console.log("Form submitted:", formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      alert("Vaše poptávka byla úspěšně odeslána. Brzy vás budeme kontaktovat.");
      
      // Reset form
      setFormData({
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
        notes: "",
      });
    } catch (error) {
      console.error("Form submission error:", error);
      alert("Nepodařilo se odeslat poptávku. Zkuste to prosím znovu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          {/* Brand Logo */}
          <div className="flex justify-center mb-8">
            <Image 
              src="/handyhands_horizontal.svg" 
              alt="HandyHands Logo" 
              width={240}
              height={96}
              className="h-16 md:h-20 lg:h-24 w-auto"
              priority
            />
          </div>
          
          <h1 className="text-3xl font-bold text-foreground mb-4">Poptávka úklidových služeb</h1>
          <p className="text-lg text-muted-foreground">
            Vyplňte formulář a my vás budeme kontaktovat s detailní nabídkou
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
                <CardTitle className="flex items-center gap-2 text-lg text-primary">
                  <Building className="h-5 w-5" />
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
                    <p className="text-2xl font-bold text-primary">
                      {hashData.totalPrice.toLocaleString('cs-CZ')} Kč <span className="text-sm font-normal text-muted-foreground">za měsíc</span>
                    </p>
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

                {/* Property Address */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Adresa nemovitosti k úklidu</h3>
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

                {/* Company Information */}
                <div className="border-t pt-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="isCompany"
                      checked={formData.isCompany}
                      onCheckedChange={(checked) => handleInputChange("isCompany", checked === true)}
                    />
                    <Label htmlFor="isCompany" className="flex items-center gap-2">
                      Objednávám služby jako firma
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
                          <Label htmlFor="companyName">Název firmy</Label>
                          <Input
                            id="companyName"
                            value={formData.companyName || ''}
                            onChange={(e) => handleInputChange("companyName", e.target.value)}
                            placeholder="Název vaší firmy"
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
                          <Label htmlFor="companyDic">DIČ</Label>
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
                          <h3 className="font-semibold">Adresa firmy</h3>
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

                {/* Additional Notes */}
                <div className="space-y-2 mt-12">
                  <Label htmlFor="notes">
                    Poznámka <span className="text-muted-foreground">(volitelné)</span>
                  </Label>
                  <Textarea
                    id="notes"
                    value={formData.notes || ''}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder="Máte nějaké speciální požadavky nebo poznámky?"
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
                        Odeslat závaznou poptávku
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
          <p>
            Po odeslání poptávky vás budeme kontaktovat do 24 hodin s detailní nabídkou.<br/>Vaše údaje jsou chráněny a používáme je pouze pro zpracování vaší poptávky.
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
            <Image
              src="/handyhands_horizontal.svg"
              alt="HandyHands"
              width={300}
              height={90}
              style={{ height: 'auto' }}
              className="mx-auto"
              priority
            />
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
