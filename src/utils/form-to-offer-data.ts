import { FormSubmissionData, FormConfig, CalculationResult, FormField } from "@/types/form-types";
import { OfferData } from "@/pdf/templates/OfferPDF";

/**
 * Converts form data and calculation results to OfferData format for PDF generation
 * Uses the form's existing structure and labels instead of complex mappings
 */
export function convertFormDataToOfferData(
  formData: FormSubmissionData,
  calculationResult: CalculationResult,
  formConfig: FormConfig,
  customerData?: { 
    firstName: string; 
    lastName: string; 
    email: string;
    phone?: string;
    address?: string;
    company?: {
      name: string;
      ico: string;
      dic: string;
      address: string;
    };
    startDate?: string;
    notes?: string;
    invoiceEmail?: string;
  }
): OfferData {
  // Round prices to nearest 10 Kč (desetikoruny)
  const roundedPrice = Math.round(calculationResult.totalMonthlyPrice / 10) * 10;
  
  // Generate Q&A pairs directly from form structure
  const summaryItems = generateSummaryItems(formData, formConfig);
  
  // Use customer-specified start date if available, otherwise check formData, otherwise default to 10 days from now
  // IMPORTANT: Always ensure the date is at least 10 days from now
  const minDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  
  const startDate = customerData?.startDate 
    ? (() => {
        // Handle both ISO date format (YYYY-MM-DD) and other formats
        const dateStr = customerData.startDate;
        let parsedDate: Date;
        
        if (dateStr.includes('-') && !dateStr.includes('T')) {
          // ISO date format (YYYY-MM-DD)
          const [year, month, day] = dateStr.split('-').map(Number);
          parsedDate = new Date(Date.UTC(year, month - 1, day));
        } else {
          // Other formats, try to parse directly
          parsedDate = new Date(dateStr);
        }
        
        // Ensure date is at least 10 days from now
        if (parsedDate < minDate) {
          parsedDate = minDate;
        }
        
        return parsedDate.toLocaleDateString("cs-CZ");
      })()
    : (formData as any)?.serviceStartDate
    ? (() => {
        // Handle serviceStartDate from formData (could be Date object or ISO string)
        const dateValue = (formData as any).serviceStartDate;
        let parsedDate: Date;
        
        if (dateValue instanceof Date) {
          parsedDate = dateValue;
        } else if (typeof dateValue === 'string') {
          if (dateValue.includes('-') && !dateValue.includes('T')) {
            // ISO date format (YYYY-MM-DD)
            const [year, month, day] = dateValue.split('-').map(Number);
            parsedDate = new Date(Date.UTC(year, month - 1, day));
          } else {
            // Other formats, try to parse directly
            parsedDate = new Date(dateValue);
          }
        } else {
          parsedDate = minDate;
        }
        
        // Ensure date is at least 10 days from now
        if (parsedDate < minDate) {
          parsedDate = minDate;
        }
        
        return parsedDate.toLocaleDateString("cs-CZ");
      })()
    : minDate.toLocaleDateString("cs-CZ");
  
  return {
    quoteDate: new Date().toLocaleDateString("cs-CZ"),
    price: roundedPrice,
    startDate,
    serviceTitle: formConfig.title,
    customer: customerData ? {
      name: `${customerData.firstName} ${customerData.lastName}`,
      email: customerData.email,
      phone: customerData.phone || '',
      address: customerData.address || '',
      // Include all additional form data (company info, notes, etc.)
      ...(customerData as Record<string, unknown>)
    } : { 
      name: "Údaje o zákazníkovi budou doplněny později" // Placeholder as requested
    },
    company: { 
      name: "HandyHands, s.r.o.", 
      address: "Praha 4, Hvězdova 13/2, PSČ 14078", 
      ico: "49240901", 
      registerInfo: "v obchodním rejstříku vedeném Městským soudem v Praze, oddíl B, vložka 2051", 
      email: "info@handyhands.cz", 
      phone: "+420 412 440 000" 
    },
    tasks: [], // Don't create tasks to avoid duplication
    summaryItems,
    notes: typeof formData.notes === 'string' ? formData.notes : undefined, // Original note from calculation form
    poptavkaNotes: customerData?.notes || undefined, // Poptávka-specific note
    conditions: formConfig.conditions || [],
    commonServices: formConfig.commonServices,
    // Add general cleaning pricing (displayed separately from monthly price)
    generalCleaningPrice: calculationResult.generalCleaningPrice,
    generalCleaningFrequency: calculationResult.generalCleaningFrequency,
    // Add winter maintenance pricing (displayed separately from monthly price)
    winterServiceFee: calculationResult.winterServiceFee,
    winterCalloutFee: calculationResult.winterCalloutFee,
    winterPeriod: formConfig.winterPeriod
  };
}

/**
 * Generates Q&A pairs directly from form structure using existing labels
 */
function generateSummaryItems(formData: FormSubmissionData, formConfig: FormConfig): { label: string; value: string }[] {
  const items: { label: string; value: string }[] = [];
  
  // Validate formConfig structure
  if (!formConfig) {
    return items;
  }
  
  if (!formConfig.sections || !Array.isArray(formConfig.sections)) {
    return items;
  }
  
  // Process each form section
  formConfig.sections.forEach((section) => {
    // Validate section structure
    if (!section || !section.fields) {
      return;
    }
    
    section.fields.forEach((field) => {
      // Validate field structure
      if (!field || !field.id) {
        return;
      }
      
      const value = formData[field.id];
      if (value === undefined || value === null || value === "") return;
      
      // Skip notes field as it's handled separately
      if (field.id === "notes") return;
      
      // Use the form's existing label, fallback to section title if empty
      const label = field.label || section.title || field.id;
      const displayValue = getFieldDisplayValue(field, value);
      
      if (displayValue) {
        items.push({ label, value: displayValue });
      }
    });
  });
  
  return items;
}

/**
 * Gets display value for a field using its existing options or simple formatting
 */
function getFieldDisplayValue(field: FormField, value: unknown): string {
  if (typeof value === 'boolean') {
    return value ? "ano" : "ne";
  }
  
  if (typeof value === 'number') {
    return value.toString();
  }
  
  if (typeof value === 'string') {
    // For radio/select fields, try to find the option label
    if (field.type === 'radio' && 'options' in field) {
      const option = field.options.find(opt => opt.value === value);
      return option ? option.label : value;
    }
    
    if (field.type === 'select' && 'options' in field) {
      const option = field.options.find(opt => opt.value === value);
      return option ? option.label : value;
    }
    
    return value;
  }
  
  if (Array.isArray(value)) {
    // Handle checkbox arrays - find matching option labels
    if (field.type === 'checkbox' && 'options' in field) {
      return value.map(v => {
        const option = field.options.find(opt => opt.value === v);
        return option ? option.label : v;
      }).join(", ");
    }
    return value.join(", ");
  }
  
  return String(value);
}
