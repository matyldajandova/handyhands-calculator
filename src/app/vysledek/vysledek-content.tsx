"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { hashService } from "@/services/hash-service";
import { hashSubmissionService } from "@/services/hash-submission-service";
import { SuccessScreen } from "@/components/success-screen";
import { AbVariantDevBadge } from "@/components/ab-variant-dev-badge";
import { AbVariantCookieSync } from "@/components/ab-variant-cookie-sync";
import { AbVariantAnalyticsSync } from "@/components/ab-variant-analytics-sync";
import { Button } from "@/components/ui/button";
import * as Icons from "lucide-react";
import Image from "next/image";
import { getFormConfig } from "@/config/services";
import { CalculationResult, FormSubmissionData } from "@/types/form-types";
import { CalculationData } from "@/utils/hash-generator";
import type { AbVariant } from "@/utils/ab-variant";
import { trackAbEvent } from "@/utils/ab-variant";

interface VysledekContentProps {
  variant: AbVariant;
}

function VysledekContentInner({ variant }: VysledekContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resultData, setResultData] = useState<{
    serviceType: string;
    serviceTitle: string;
    totalPrice: number;
    currency: string;
    calculationData?: CalculationData;
  } | null>(null);
  const funnelViewTracked = useRef(false);

  useEffect(() => {
    const loadResultData = async () => {
      try {
        const hash = searchParams.get('hash');
        
        if (!hash) {
          setError('Chybí hash parametr pro načtení výsledků');
          setIsLoading(false);
          return;
        }

        if (hashSubmissionService.isHashSubmitted(hash)) {
          router.replace(`/poptavka?hash=${hash}`);
          return;
        }

        if (!hash || hash.length < 10) {
          setError('Neplatný hash - příliš krátký');
          setIsLoading(false);
          return;
        }
        
        let decodedData;
        try {
          decodedData = hashService.decodeHash(hash);
        } catch {
          setError('Neplatný hash - nelze načíst data');
          setIsLoading(false);
          return;
        }
        
        if (!decodedData) {
          setError('Nelze načíst data z hash');
          setIsLoading(false);
          return;
        }

        if (!decodedData.serviceTitle || decodedData.serviceTitle.trim?.() === '') {
          try {
            const cfg = getFormConfig(decodedData.serviceType);
            if (cfg?.title) decodedData.serviceTitle = cfg.title;
          } catch {}
        }

        if (!decodedData.calculationData) {
          try {
            const cfg = getFormConfig(decodedData.serviceType || decodedData.serviceTitle);
            const decodedAsRecord = decodedData as unknown as Record<string, unknown>;
            const calculationData = decodedAsRecord.calculationData as Record<string, unknown> | undefined;
            const cd = decodedAsRecord.cd as Record<string, unknown> | undefined;
            const fd = calculationData?.formData || cd?.fd;
            
            if (cfg && fd) {
              const { calculatePrice } = await import("@/utils/calculation");
              const calc = await calculatePrice(fd as FormSubmissionData, cfg);
              decodedData.calculationData = {
                ...calc,
                formData: fd,
                orderId: calculationData?.orderId || cd?.oid
              } as unknown as CalculationData;
            }
          } catch {}
        }

        setResultData(decodedData);
        setIsLoading(false);

        if (!funnelViewTracked.current) {
          funnelViewTracked.current = true;
          trackAbEvent('ab_funnel_view', variant, {
            serviceType: decodedData.serviceType || '',
            serviceTitle: decodedData.serviceTitle || '',
            price: decodedData.totalPrice,
            hash,
          });
        }
        
      } catch {
        setError('Chyba při načítání výsledků');
        setIsLoading(false);
      }
    };

    loadResultData();
  }, [searchParams, router, variant]);

  const handleBackToServices = () => {
    router.push('/');
  };

  if (isLoading) {
    return (
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
          <div className="mb-8">
            <Image
              src="/handyhands_horizontal.svg"
              alt="HandyHands"
              width={300}
              height={90}
              style={{ height: 'auto' }}
              className="mx-auto"
            />
          </div>
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
          <Button 
            onClick={handleBackToServices}
            size="lg"
          >
            <Icons.ArrowLeft className="h-5 w-5" />
            Zpět na výběr služby
          </Button>
        </div>
      </div>
    );
  }

  const { calculationData, serviceTitle, serviceType } = resultData;
  
  if (!calculationData) {
    setError('Chybí data kalkulace');
    return null;
  }

  const formConfig = getFormConfig(serviceType || serviceTitle);
  
  if (!formConfig) {
    setError('Nepodařilo se načíst konfiguraci formuláře');
    return null;
  }

  const successScreenData = {
    calculationResult: calculationData as unknown as CalculationResult,
    formConfig: formConfig,
    formData: (calculationData.formData as Record<string, string | number | string[] | boolean | undefined>) || {},
  };

  return (
    <>
      <AbVariantCookieSync variant={variant} />
      <AbVariantAnalyticsSync variant={variant} />
      <SuccessScreen
        variant={variant}
        onBackToServices={handleBackToServices}
        calculationResult={successScreenData.calculationResult}
        formConfig={successScreenData.formConfig}
        formData={successScreenData.formData}
      />
      <AbVariantDevBadge variant={variant} />
    </>
  );
}

export default function VysledekContent({ variant }: VysledekContentProps) {
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
            />
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Načítání...</h1>
        </div>
      </div>
    }>
      <VysledekContentInner variant={variant} />
    </Suspense>
  );
}
