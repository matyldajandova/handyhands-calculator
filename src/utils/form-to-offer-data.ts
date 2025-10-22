import { FormSubmissionData, FormConfig, CalculationResult, FormField } from "@/types/form-types";
import { OfferData } from "@/pdf/templates/OfferPDF";

// Helper function to get minimum hours for hourly services
function getMinimumHours(formData: FormSubmissionData): number {
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

// Helper function to get grouped addons for PDF (matches success screen logic)
function getGroupedAddonsForPDF(formData: FormSubmissionData, formConfig: FormConfig, calculationResult: CalculationResult) {
  const items: Array<{ label: string; amount: number }> = [];
  
  // Get fixed addons from applied coefficients
  const fixedAddons = calculationResult.calculationDetails.appliedCoefficients
    .filter(coeff => coeff.impact > 0 && coeff.coefficient === 1);
  
  // Group addons by section
  const sectionMap = new Map<string, number>();
  let transportAmount = 0;
  
  for (const addon of fixedAddons) {
    // Special handling for transport/delivery
    if (addon.field === 'zipCode' || addon.label.includes('Doprava') || addon.label.includes('doprava')) {
      transportAmount = addon.impact;
    } else {
      // Find the section title for this field
      const section = formConfig.sections.find(section => 
        section.fields.some(field => field.id === addon.field)
      );
      
      if (section) {
        const sectionTitle = section.title;
        if (!sectionMap.has(sectionTitle)) {
          sectionMap.set(sectionTitle, 0);
        }
        sectionMap.set(sectionTitle, sectionMap.get(sectionTitle)! + addon.impact);
      }
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
  // Round prices appropriately based on service type
  const isHourlyService = formConfig.id === "one-time-cleaning" || formConfig.id === "handyman-services";
  const roundedPrice = isHourlyService 
    ? Math.round(calculationResult.hourlyRate || calculationResult.totalMonthlyPrice) // Round to whole crowns for hourly services
    : Math.round(calculationResult.totalMonthlyPrice / 10) * 10; // Round to nearest 10 Kč for regular services
  
  // Generate Q&A pairs directly from form structure
  const summaryItems = generateSummaryItems(formData, formConfig);
  
  // Use customer-specified start date if available, otherwise check formData, otherwise default to 10 days from now
  // IMPORTANT: Always ensure the date is at least 10 days from now
  const minDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  
  // Helper type to access serviceStartDate which may exist in formData
  type FormDataWithStartDate = FormSubmissionData & { serviceStartDate?: string | Date };
  
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
    : (formData as FormDataWithStartDate)?.serviceStartDate
    ? (() => {
        // Handle serviceStartDate from formData (could be Date object or ISO string)
        const dateValue = (formData as FormDataWithStartDate).serviceStartDate;
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
  
  // Extract fixed addons for hourly services (grouped by section like in success screen)
  const fixedAddons = isHourlyService ? getGroupedAddonsForPDF(formData, formConfig, calculationResult) : undefined;

  // Get minimum hours for hourly services
  const minimumHours = isHourlyService ? getMinimumHours(formData) : undefined;

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
    winterPeriod: formConfig.winterPeriod,
    // Add hourly service information
    isHourlyService,
    hourlyRate: calculationResult.hourlyRate,
    fixedAddons,
    minimumHours
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
