"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building, Home, Warehouse, Store, Factory, School, FileText, Building2 } from "lucide-react";
import { serviceTypes } from "@/config/services";
import { getSlugFromServiceId } from "@/utils/slug-mapping";
import Image from "next/image";

interface ServiceTypeSelectorProps {
  onServiceTypeSelect?: (serviceType: string) => void; // Made optional for backward compatibility
}

export function ServiceTypeSelector({ onServiceTypeSelect }: ServiceTypeSelectorProps) {
  const router = useRouter();
  const [selectedService, setSelectedService] = useState<string>("");
  const [hasAnimated, setHasAnimated] = useState(false);

  // Prevent animation from running multiple times
  useEffect(() => {
    if (!hasAnimated) {
      setHasAnimated(true);
    }
  }, [hasAnimated]);

  const handleServiceSelect = (value: string) => {
    const selectedServiceType = serviceTypes.find(service => service.id === value);
    if (selectedServiceType && selectedServiceType.formConfig) {
      setSelectedService(value);
      
      // Use new routing system
      const slug = getSlugFromServiceId(value);
      if (slug) {
        router.push(`/kalkulator/${slug}`);
      }
      
      // Fallback to callback for backward compatibility
      if (onServiceTypeSelect) {
        onServiceTypeSelect(value);
      }
    }
  };

  const getIconComponent = (iconName: string) => {
    const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
      Building,
      Home,
      Warehouse,
      Store,
      Factory,
      School,
      FileText,
      Building2
    };
    return iconMap[iconName] || Building;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-6xl mx-auto"
    >
      <div className="text-center mb-12">
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
        
        <h1 className="text-4xl font-bold text-foreground font-heading mb-4">
          Kalkulátor úklidových a řemeslných služeb
        </h1>
        <p className="text-xl text-muted-foreground font-sans max-w-2xl mx-auto">
          Vyberte typ služby a získejte obratem přesnou kalkulaci našich prací
        </p>
      </div>

      <RadioGroup
        value={selectedService}
        onValueChange={handleServiceSelect}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {serviceTypes.filter(service => !service.formConfig?.hidden).map((service, index) => {
          const isDisabled = !service.formConfig;
          const IconComponent = getIconComponent(service.icon);
          
          return (
            <motion.div
              key={service.id}
              initial={hasAnimated ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.5, 
                delay: hasAnimated ? 0 : index * 0.05,
                ease: "easeOut"
              }}
              whileHover={{ scale: isDisabled ? 1 : 1.02 }}
              whileTap={{ scale: isDisabled ? 1 : 0.98 }}
              className="relative"
            >
              <RadioGroupItem
                value={service.id}
                id={service.id}
                disabled={isDisabled}
                className="sr-only"
              />
              <Label
                htmlFor={service.id}
                className={`block cursor-pointer h-full ${isDisabled ? 'cursor-not-allowed' : ''}`}
              >
                <Card className={`peer-checked:ring-2 peer-checked:ring-accent peer-checked:border-accent transition-all duration-200 hover:shadow-lg h-full flex flex-col gap-2 ${
                  isDisabled 
                    ? 'cursor-not-allowed'
                    : 'peer-checked:ring-2 peer-checked:ring-accent peer-checked:border-accent hover:shadow-lg'
                }`}>
                  <CardHeader className="flex-shrink-0 gap-3">
                    <div className={`${isDisabled ? 'text-muted-foreground/70' : 'text-accent'}`}>
                      <IconComponent className="h-8 w-8" />
                    </div>
                    <CardTitle className={`text-lg font-semibold font-heading ${
                      isDisabled ? 'text-foreground/80' : 'text-foreground'
                    }`}>
                      {service.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className={`text-sm leading-relaxed font-sans font-normal ${
                      isDisabled ? 'text-muted-foreground/70' : 'text-muted-foreground'
                    }`}>
                      {service.description}
                    </p>
                  </CardContent>
                  {isDisabled && (
                    <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] rounded-lg flex items-start justify-end p-3">
                      <Badge className="bg-accent text-accent-foreground px-3 py-1.5 rounded-full text-xs font-medium shadow-sm">
                        Brzy k dispozici
                      </Badge>
                    </div>
                  )}
                </Card>
              </Label>
            </motion.div>
          );
        })}
      </RadioGroup>
    </motion.div>
  );
}
