"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckCircle, 
  Building, 
  Home, 
  Warehouse, 
  Store, 
  Building2, 
  Factory, 
  School, 
  FileText 
} from "lucide-react";
import { serviceTypes } from "@/config/services";

interface ServiceTypeSelectorProps {
  onServiceTypeSelect: (serviceType: string) => void;
}

export function ServiceTypeSelector({ onServiceTypeSelect }: ServiceTypeSelectorProps) {
  const [selectedService, setSelectedService] = useState<string>("");

  const handleServiceSelect = (value: string) => {
    setSelectedService(value);
    onServiceTypeSelect(value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-4xl mx-auto"
    >
      <div className="text-center mb-12">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance text-foreground font-heading mb-6">
          Handy Hands Calculator
        </h1>
        <p className="text-muted-foreground text-xl leading-7 font-sans max-w-2xl mx-auto">
          Vyberte typ služby, pro kterou chcete vypočítat cenu úklidových služeb
        </p>
      </div>

      <RadioGroup
        value={selectedService}
        onValueChange={handleServiceSelect}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {serviceTypes.map((service) => (
          <motion.div
            key={service.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="h-full"
          >
            <RadioGroupItem
              value={service.id}
              id={service.id}
              className="peer sr-only"
            />
            <Label
              htmlFor={service.id}
              className="block cursor-pointer h-full"
            >
              <Card className="peer-checked:ring-2 peer-checked:ring-accent peer-checked:border-accent transition-all duration-200 hover:shadow-lg h-full flex flex-col">
                <CardHeader className="pb-3 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="text-accent">
                      {getIconComponent(service.icon)}
                    </div>
                    {selectedService === service.id && (
                      <CheckCircle className="h-6 w-6 text-accent" />
                    )}
                  </div>
                  <CardTitle className="text-lg font-semibold text-foreground font-heading">
                    {service.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                    {service.description}
                  </p>
                </CardContent>
              </Card>
            </Label>
          </motion.div>
        ))}
      </RadioGroup>
    </motion.div>
  );
}

// Helper function to get icon component
function getIconComponent(iconName: string) {
  const iconMap: Record<string, React.ReactNode> = {
    Building: <Building className="h-6 w-6" />,
    Home: <Home className="h-6 w-6" />,
    Warehouse: <Warehouse className="h-6 w-6" />,
    Store: <Store className="h-6 w-6" />,
    Building2: <Building2 className="h-6 w-6" />,
    Factory: <Factory className="h-6 w-6" />,
    School: <School className="h-6 w-6" />,
    FileText: <FileText className="h-6 w-6" />
  };
  
  return iconMap[iconName] || <Building className="h-6 w-6" />;
}
