"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText } from "lucide-react";

interface IdentificationStepProps {
  onDownloadPDF: (customerData: { firstName: string; lastName: string; email: string }) => void;
  isDownloading?: boolean;
  initialData?: { firstName?: string; lastName?: string; email?: string };
  onDataChange?: (customerData: { firstName: string; lastName: string; email: string }) => void;
}

export function IdentificationStep({ onDownloadPDF, isDownloading = false, initialData, onDataChange }: IdentificationStepProps) {
  const [firstName, setFirstName] = useState(initialData?.firstName || "");
  const [lastName, setLastName] = useState(initialData?.lastName || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string; email?: string }>({});
  const hasPopulatedRef = useRef(false);

  // Update form fields when initialData changes, but only once per mount
  useEffect(() => {
    if (initialData && !hasPopulatedRef.current) {
      setFirstName(initialData.firstName || "");
      setLastName(initialData.lastName || "");
      setEmail(initialData.email || "");
      hasPopulatedRef.current = true;
    }
  }, [initialData]);

  // Only notify parent when form data changes, but don't update hash automatically
  // This prevents infinite loops while still allowing the parent to track changes
  const lastDataRef = useRef<string>('');
  
  useEffect(() => {
    if (onDataChange && (firstName || lastName || email)) {
      const currentData = `${firstName}|${lastName}|${email}`;
      
      // Only call onDataChange if the data actually changed
      if (currentData !== lastDataRef.current) {
        lastDataRef.current = currentData;
        onDataChange({ firstName, lastName, email });
      }
    }
  }, [firstName, lastName, email, onDataChange]);

  const validateForm = () => {
    const newErrors: { firstName?: string; lastName?: string; email?: string } = {};

    if (!firstName.trim()) {
      newErrors.firstName = "Jméno je povinné";
    }

    if (!lastName.trim()) {
      newErrors.lastName = "Příjmení je povinné";
    }

    if (!email.trim()) {
      newErrors.email = "E-mail je povinný";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Zadejte platný e-mail";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDownload = () => {
    if (validateForm()) {
      onDownloadPDF({ 
        firstName: firstName.trim(), 
        lastName: lastName.trim(), 
        email: email.trim() 
      });
    }
  };

  const isFormValid = firstName.trim() && lastName.trim() && email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <Card className="w-full border-green-200 bg-green-50/50 dark:bg-green-950/10 dark:border-green-800">
      <CardHeader className="text-center mb-2">
        <CardTitle className="text-xl flex items-center justify-center gap-2">
          <FileText className="h-5 w-5 text-green-success" />
          Stažení PDF kalkulace
        </CardTitle>
        <CardDescription>
          PDF obsahuje detailní rozpis ceny a specifikace služeb.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Name fields side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* First Name field */}
          <div className="space-y-2">
            <Label htmlFor="firstName">Jméno</Label>
            <Input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Jan"
              className={errors.firstName ? "border-destructive" : "hover:border-green-light focus:border-green-success focus-visible:border-green-success focus:ring-green-success/30 focus-visible:ring-green-success/30 focus-visible:ring-[3px]"}
            />
            {errors.firstName && (
              <p className="text-sm text-red-600">{errors.firstName}</p>
            )}
          </div>

          {/* Last Name field */}
          <div className="space-y-2">
            <Label htmlFor="lastName">Příjmení</Label>
            <Input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Novák"
              className={errors.lastName ? "border-destructive" : "hover:border-green-light focus:border-green-success focus-visible:border-green-success focus:ring-green-success/30 focus-visible:ring-green-success/30 focus-visible:ring-[3px]"}
            />
            {errors.lastName && (
              <p className="text-sm text-red-600">{errors.lastName}</p>
            )}
          </div>
        </div>

        {/* Email field */}
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jan.novak@email.cz"
            className={errors.email ? "border-destructive" : "hover:border-green-light focus:border-green-success focus-visible:border-green-success focus:ring-green-success/30 focus-visible:ring-green-success/30 focus-visible:ring-[3px]"}
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Download button */}
        <Button
          onClick={handleDownload}
          disabled={!isFormValid || isDownloading}
          className="mt-2 bg-green-600 hover:bg-green-700 text-white"
          size="lg"
        >
          {isDownloading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Generuji PDF...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Stáhnout PDF kalkulaci
            </>
          )}
        </Button>

        {/* Privacy notice */}
        <p className="text-xs text-muted-foreground text-center">
          Vaše údaje používáme pouze pro zaslání kalkulace.<br/>Nezasíláme spam ani neprodáváme vaše kontaktní údaje třetím stranám.
        </p>
      </CardContent>
    </Card>
  );
}