"use client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Download, FileText, Calculator, Building } from "lucide-react";
import { FormSubmissionData } from "@/types/form-types";

interface SuccessScreenProps {
  onBackToServices: () => void;
  formData: FormSubmissionData | null;
  serviceType: string;
}

export function SuccessScreen({ onBackToServices, formData, serviceType }: SuccessScreenProps) {
  const handleDownloadPDF = () => {
    // Mock PDF download - in real implementation, this would generate and download a PDF
    console.log("Downloading PDF for:", { formData, serviceType });
    
    // Create a mock PDF content (in real app, use a library like jsPDF or react-pdf)
    const mockPDFContent = `
      Kalkulace úklidových služeb
      Služba: ${serviceType}
      Datum: ${new Date().toLocaleDateString('cs-CZ')}
      
      Výsledek kalkulace:
      - Základní cena: 15,000 Kč/měsíc
      - Aplikované koeficienty: -2,500 Kč
      - Finální cena: 12,500 Kč/měsíc
      
      Detaily služby byly úspěšně vypočítány.
    `;
    
    // Create and download file
    const blob = new Blob([mockPDFContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kalkulace-uklidovych-sluzeb-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-background via-secondary to-background p-4 flex items-center justify-center"
    >
      <div className="w-full max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="flex justify-center mb-6"
        >
          <div className="relative">
            <CheckCircle className="h-20 w-20 text-green-500" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute -top-2 -right-2"
            >
              <Calculator className="h-8 w-8 text-accent" />
            </motion.div>
          </div>
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-center">
                <Building className="h-5 w-5 text-accent" />
                Výsledek kalkulace
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-muted/20 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">15,000 Kč</div>
                  <div className="text-sm text-muted-foreground">Základní cena</div>
                </div>
                <div className="p-4 bg-muted/20 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">-2,500 Kč</div>
                  <div className="text-sm text-muted-foreground">Koeficienty</div>
                </div>
                <div className="p-4 bg-accent/20 rounded-lg border-2 border-accent">
                  <div className="text-2xl font-bold text-accent">12,500 Kč</div>
                  <div className="text-sm text-accent-foreground">Finální cena/měsíc</div>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                * Cena je orientační a může se lišit podle konkrétních podmínek
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="space-y-4"
        >
          <Button
            onClick={handleDownloadPDF}
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
          >
            <Download className="h-5 w-5 mr-2" />
            Stáhnout PDF kalkulaci
          </Button>
          
          <div className="text-sm text-muted-foreground">
            <FileText className="h-4 w-4 inline mr-1" />
            PDF obsahuje detailní rozpis ceny a specifikace služeb
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-12"
        >
          <Button
            onClick={onBackToServices}
            variant="outline"
            size="lg"
          >
            ← Zpět na výběr služby
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
