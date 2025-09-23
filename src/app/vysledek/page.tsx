"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { hashService } from "@/services/hash-service";
import { SuccessScreen } from "@/components/success-screen";
import { Button } from "@/components/ui/button";
import * as Icons from "lucide-react";
import Image from "next/image";
import { getFormConfig } from "@/config/services";
import { CalculationResult } from "@/types/form-types";

function VysledekContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resultData, setResultData] = useState<{
    serviceType: string;
    serviceTitle: string;
    totalPrice: number;
    currency: string;
    calculationData?: Record<string, unknown>;
  } | null>(null);

  useEffect(() => {
    const loadResultData = async () => {
      try {
        const hash = searchParams.get('hash');
        
        if (!hash) {
          setError('Chybí hash parametr pro načtení výsledků');
          setIsLoading(false);
          return;
        }

        console.log('Loading result data from hash:', hash);
        
        // Basic validation of hash format
        if (!hash || hash.length < 10) {
          setError('Neplatný hash - příliš krátký');
          setIsLoading(false);
          return;
        }
        
        // Decode the hash to get the full result data
        let decodedData;
        try {
          decodedData = hashService.decodeHash(hash);
        } catch (error) {
          console.error('Error decoding hash:', error);
          setError('Neplatný hash - nelze načíst data');
          setIsLoading(false);
          return;
        }
        
        if (!decodedData) {
          setError('Nelze načíst data z hash');
          setIsLoading(false);
          return;
        }

        console.log('Successfully decoded result data:', decodedData);
        
        // Set the result data
        setResultData(decodedData);
        setIsLoading(false);
        
      } catch (error) {
        console.error('Error loading result data:', error);
        setError('Chyba při načítání výsledků');
        setIsLoading(false);
      }
    };

    loadResultData();
  }, [searchParams]);

  const handleBackToServices = () => {
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background p-4 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          {/* Company Logo */}
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
          
          {/* Loading Spinner */}
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Načítání výsledků...</h1>
          <p className="text-muted-foreground">Prosím čekejte</p>
        </div>
      </div>
    );
  }

  if (error || !resultData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background p-4 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          {/* Company Logo */}
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
          
          {/* Error Message */}
          <h1 className="text-3xl font-bold text-foreground mb-4">Chyba při načítání</h1>
          <p className="text-muted-foreground mb-8">
            {error === 'Neplatný hash - nelze načíst data' 
              ? 'Odkaz na výsledky je neplatný nebo poškozený.'
              : error === 'Neplatný hash - příliš krátký'
              ? 'Odkaz na výsledky má nesprávný formát.'
              : error === 'Chybí hash parametr pro načtení výsledků'
              ? 'Chybí odkaz na výsledky v URL.'
              : error || 'Výsledky kalkulace nebyly nalezeny.'}
          </p>
          
          {/* Back Button */}
          <Button 
            onClick={handleBackToServices}
            size="lg"
            className=""
          >
            <Icons.ArrowLeft className="h-5 w-5" />
            Zpět na výběr služby
          </Button>
        </div>
      </div>
    );
  }

  // Extract the necessary data from the hash
  const { calculationData, serviceTitle, serviceType } = resultData;
  
  if (!calculationData) {
    setError('Chybí data kalkulace');
    return null;
  }

  // Get the proper form config based on service type
  const formConfig = getFormConfig(serviceType || serviceTitle);
  
  if (!formConfig) {
    setError('Nepodařilo se načíst konfiguraci formuláře');
    return null;
  }

  // Create the data structure expected by SuccessScreen
  const successScreenData = {
    calculationResult: calculationData as unknown as CalculationResult,
    formConfig: formConfig,
    formData: (calculationData.formData as Record<string, string | number | string[] | boolean | undefined>) || {},
  };

  return (
    <SuccessScreen
      onBackToServices={handleBackToServices}
      calculationResult={successScreenData.calculationResult}
      formConfig={successScreenData.formConfig}
      formData={successScreenData.formData}
    />
  );
}

export default function VysledekPage() {
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
      <VysledekContent />
    </Suspense>
  );
}
