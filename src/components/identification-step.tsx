"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";

interface IdentificationStepProps {
  onDownloadPDF: (customerData: { name: string; email: string }) => void;
  isDownloading?: boolean;
}

export function IdentificationStep({ onDownloadPDF, isDownloading = false }: IdentificationStepProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const validateForm = () => {
    const newErrors: { name?: string; email?: string } = {};

    if (!name.trim()) {
      newErrors.name = "Jméno je povinné";
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
      onDownloadPDF({ name: name.trim(), email: email.trim() });
    }
  };

  const isFormValid = name.trim() && email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <Card className="w-full">
      <CardHeader className="text-center mb-2">
        <CardTitle className="text-xl">Stažení PDF kalkulace</CardTitle>
        <CardDescription>
          Pro stažení detailní kalkulace prosím vyplňte následující údaje
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Name field */}
        <div className="space-y-2">
          <Label htmlFor="name">Jméno a příjmení</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jan Novák"
            className={errors.name ? "border-red-500" : ""}
          />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name}</p>
          )}
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
            className={errors.email ? "border-red-500" : ""}
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Download button */}
        <Button
          onClick={handleDownload}
          disabled={!isFormValid || isDownloading}
          className="mt-2"
          size="lg"
        >
          {isDownloading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generuji PDF...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
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
