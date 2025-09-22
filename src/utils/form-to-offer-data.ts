import { FormSubmissionData, FormConfig, CalculationResult, FormField } from "@/types/form-types";
import { OfferData } from "@/pdf/templates/OfferPDF";

/**
 * Converts form data and calculation results to OfferData format for PDF generation
 * Uses the form's existing structure and labels instead of complex mappings
 */
export function convertFormDataToOfferData(
  formData: FormSubmissionData,
  calculationResult: CalculationResult,
  formConfig: FormConfig
): OfferData {
  // Round prices to nearest 10 Kč (desetikoruny)
  const roundedPrice = Math.round(calculationResult.totalMonthlyPrice / 10) * 10;
  
  // Generate Q&A pairs directly from form structure
  const summaryItems = generateSummaryItems(formData, formConfig);
  
  // Calculate start date (10 days from now)
  const startDate = new Date(Date.now() + 10 * 86400000).toLocaleDateString("cs-CZ");
  
  return {
    quoteDate: new Date().toLocaleDateString("cs-CZ"),
    price: roundedPrice,
    startDate,
    customer: { 
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
    notes: typeof formData.notes === 'string' ? formData.notes : undefined,
    conditions: formConfig.conditions || [],
    commonServices: formConfig.commonServices
  };
}

/**
 * Generates Q&A pairs directly from form structure using existing labels
 */
function generateSummaryItems(formData: FormSubmissionData, formConfig: FormConfig): { label: string; value: string }[] {
  const items: { label: string; value: string }[] = [];
  
  // Process each form section
  formConfig.sections.forEach(section => {
    section.fields.forEach(field => {
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
