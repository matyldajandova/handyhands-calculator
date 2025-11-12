import { FormSubmissionData, FormConfig, CalculationResult, FormField, CheckboxField } from "@/types/form-types";
import { OfferData } from "@/pdf/templates/OfferPDF";
import { reconstructCalculationDetails } from "@/utils/calculation-reconstruction";

// Helper function to get minimum hours for hourly services
function getMinimumHours(formData: FormSubmissionData): number {
  // For one-time cleaning
  if (formData.spaceArea) {
    const baseAreaHours: Record<string, number> = {
      "up-to-30": 3,
      "up-to-50": 3.5,
      "50-75": 4,
      "75-100": 4,
      "100-125": 4,
      "125-200": 4,
      "200-plus": 4
    };
    
    // If window cleaning is selected, override minimum hours
    if (formData.windowCleaning === "yes") {
      const windowCleaningHours: Record<string, number> = {
        "up-to-30": 4,
        "up-to-50": 4,
        "50-75": 5,
        "75-100": 5,
        "100-125": 6,
        "125-200": 6,
        "200-plus": 6
      };
      return windowCleaningHours[formData.spaceArea as string] || 6;
    }
    
    return baseAreaHours[formData.spaceArea as string] || 4;
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
async function getGroupedAddonsForPDF(formData: FormSubmissionData, formConfig: FormConfig, calculationResult: CalculationResult) {
  const items: Array<{ label: string; amount: number }> = [];
  
  // Reconstruct calculationDetails if missing (for optimized hashes)
  let calculationDetails = calculationResult.calculationDetails;
  if (!calculationDetails?.appliedCoefficients || calculationDetails.appliedCoefficients.length === 0) {
    calculationDetails = await reconstructCalculationDetails(formData, formConfig, calculationResult);
  }
  
  // Get fixed addons from applied coefficients
  const fixedAddons = calculationDetails.appliedCoefficients
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
 * Extracts optional services from formData and formats them for commonServices
 */
function extractOptionalServices(formData: FormSubmissionData, formConfig: FormConfig): {
  perCleaning?: string[];
  monthly?: string[];
  weekly?: string[];
} {
  const optionalServices: {
    perCleaning?: string[];
    monthly?: string[];
    weekly?: string[];
  } = {};

  // Map form field IDs to commonServices keys
  const fieldMapping: Record<string, keyof typeof optionalServices> = {
    'optionalServicesPerCleaning': 'perCleaning',
    'optionalServicesMonthly': 'monthly',
    'optionalServicesWeekly': 'weekly',
  };

  // Find optional service fields in form config
  for (const section of formConfig.sections || []) {
    for (const field of section.fields || []) {
      const targetKey = fieldMapping[field.id];
      if (targetKey && field.type === 'checkbox') {
        const selectedValues = formData[field.id] as string[] | undefined;
        if (selectedValues && selectedValues.length > 0) {
          const checkboxField = field as CheckboxField;
          const serviceItems: string[] = [];
          
          selectedValues.forEach(value => {
            const option = checkboxField.options?.find(opt => opt.value === value);
            if (option && option.fixedAddon) {
              const label = option.label || value;
              // Format as "příplatkové služby: [service] (+[price] Kč / měsíc)"
              // Most labels already include the price, so check and format accordingly
              if (label.includes('(+') || label.includes('(+')) {
                // Label already has price format, just add prefix
                serviceItems.push(`příplatkové služby: ${label}`);
              } else {
                // Add price if not present
                serviceItems.push(`příplatkové služby: ${label} (+${option.fixedAddon} Kč / měsíc)`);
              }
            }
          });

          if (serviceItems.length > 0) {
            optionalServices[targetKey] = [...(optionalServices[targetKey] || []), ...serviceItems];
          }
        }
      }
    }
  }

  return optionalServices;
}

/**
 * Converts form data and calculation results to OfferData format for PDF generation
 * Uses the form's existing structure and labels instead of complex mappings
 */
export async function convertFormDataToOfferData(
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
): Promise<OfferData> {
  // Round prices appropriately based on service type
  const isHourlyService = formConfig.id === "one-time-cleaning" || formConfig.id === "handyman-services";
  const roundedPrice = isHourlyService 
    ? Math.round(calculationResult.hourlyRate || calculationResult.totalMonthlyPrice) // Round to whole crowns for hourly services
    : Math.round(calculationResult.totalMonthlyPrice / 10) * 10; // Round to nearest 10 Kč for regular services
  
  // Generate Q&A pairs directly from form structure
  const summaryItems = generateSummaryItems(formData, formConfig);
  
  // Determine minimum delay: 1 day for one-time cleaning and window washing, 10 days for regular services
  const daysDelay = isHourlyService ? 1 : 10;
  const minDate = new Date(Date.now() + daysDelay * 24 * 60 * 60 * 1000);
  
  // Helper type to access serviceStartDate which may exist in formData
  type FormDataWithStartDate = FormSubmissionData & { serviceStartDate?: string | Date };
  
  const startDate = customerData?.startDate 
    ? (() => {
        // Handle both ISO date format (YYYY-MM-DD) and other formats
        const dateStr = customerData.startDate;
        let parsedDate: Date;
        
        if (dateStr.includes('-') && !dateStr.includes('T')) {
          // ISO date format (YYYY-MM-DD) - use local date constructor to avoid timezone shifts
          const [year, month, day] = dateStr.split('-').map(Number);
          parsedDate = new Date(year, month - 1, day);
        } else {
          // Other formats, try to parse directly
          parsedDate = new Date(dateStr);
        }
        
        // Ensure date is at least the minimum delay from now
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
            // ISO date format (YYYY-MM-DD) - use local date constructor to avoid timezone shifts
            const [year, month, day] = dateValue.split('-').map(Number);
            parsedDate = new Date(year, month - 1, day);
          } else {
            // Other formats, try to parse directly
            parsedDate = new Date(dateValue);
          }
        } else {
          parsedDate = minDate;
        }
        
        // Ensure date is at least the minimum delay from now
        if (parsedDate < minDate) {
          parsedDate = minDate;
        }
        
        return parsedDate.toLocaleDateString("cs-CZ");
      })()
    : minDate.toLocaleDateString("cs-CZ");
  
  // Extract fixed addons for hourly services (grouped by section like in success screen)
  const fixedAddons = isHourlyService ? await getGroupedAddonsForPDF(formData, formConfig, calculationResult) : undefined;

  // Get minimum hours for hourly services
  const minimumHours = isHourlyService ? getMinimumHours(formData) : undefined;

  // Get cleaning frequency label for dynamic text
  let cleaningFrequencyLabel = '';
  if (formData.cleaningFrequency) {
    const frequencyField = formConfig.sections
      ?.flatMap(s => s.fields || [])
      .find(f => f.id === 'cleaningFrequency');
    if (frequencyField && frequencyField.type === 'radio' && 'options' in frequencyField) {
      const option = frequencyField.options.find(opt => opt.value === formData.cleaningFrequency);
      cleaningFrequencyLabel = option?.label || '';
    }
  }

  return {
    quoteDate: new Date().toLocaleDateString("cs-CZ"),
    price: roundedPrice,
    startDate,
    serviceTitle: formConfig.title,
    serviceType: formConfig.id,
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
    // IMPORTANT: These two notes are ABSOLUTELY separate and must NEVER be interchanged
    notes: typeof formData.notes === 'string' && formData.notes.trim() !== '' ? formData.notes : undefined, // Original note from calculation form ONLY
    poptavkaNotes: customerData?.notes && customerData.notes.trim() !== '' ? customerData.notes : undefined, // Poptávka page note ONLY
    conditions: formConfig.conditions || [],
    commonServices: (() => {
      const baseServices = formConfig.commonServices || {};
      const optionalServices = extractOptionalServices(formData, formConfig);
      
      // Merge optional services into commonServices
      return {
        ...baseServices,
        perCleaning: [
          ...(baseServices.perCleaning || []),
          ...(optionalServices.perCleaning || [])
        ],
        monthly: [
          ...(baseServices.monthly || []),
          ...(optionalServices.monthly || [])
        ],
        weekly: [
          ...(baseServices.weekly || []),
          ...(optionalServices.weekly || [])
        ]
      };
    })(),
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
    minimumHours,
    cleaningFrequency: formData.cleaningFrequency as string | undefined,
    cleaningFrequencyLabel: cleaningFrequencyLabel || undefined
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
  
  // Helper function to process a field (used recursively for conditional fields)
  const processField = (field: FormField, sectionTitle: string) => {
    // Validate field structure
    if (!field || !field.id) {
      return;
    }
    
    // Handle conditional fields - process their nested fields
    if (field.type === 'conditional' && 'fields' in field) {
      const conditionalField = field as import("@/types/form-types").ConditionalField;
      // Check if condition is met
      let conditionMet = false;
      if ('field' in conditionalField.condition) {
        const conditionValue = formData[conditionalField.condition.field];
        const operator = conditionalField.condition.operator || 'equals';
        conditionMet = operator === 'equals' 
          ? conditionValue === conditionalField.condition.value
          : conditionValue !== conditionalField.condition.value;
      } else {
        // Complex condition with 'and' or 'or'
        // For now, skip complex conditions - they're less common
        conditionMet = false;
      }
      
      if (conditionMet && conditionalField.fields) {
        conditionalField.fields.forEach(subField => {
          processField(subField, sectionTitle);
        });
      }
      return;
    }
    
    // Check if field has its own condition (nested conditional)
    if ('condition' in field && field.condition && 'field' in field.condition) {
      const conditionValue = formData[field.condition.field];
      const operator = field.condition.operator || 'equals';
      const conditionMet = operator === 'equals' 
        ? conditionValue === field.condition.value
        : conditionValue !== field.condition.value;
      
      if (!conditionMet) {
        return; // Skip this field if condition not met
      }
    }
    
    const value = formData[field.id];
    if (value === undefined || value === null || value === "") return;
    
    // Skip notes field as it's handled separately
    if (field.id === "notes") return;

    // Special handling for checkbox fields
    if (field.type === 'checkbox' && 'options' in field) {
      const selectedValues = Array.isArray(value) ? value : [];
      if (selectedValues.length === 0) return;

      const pricedSelections: string[] = [];

      selectedValues.forEach(selectedValue => {
        const option = field.options?.find(opt => opt.value === selectedValue);
        const optionLabel = option?.label || field.label || sectionTitle || field.id;

        if (option?.fixedAddon !== undefined) {
          pricedSelections.push(optionLabel);
        } else {
          items.push({
            label: optionLabel,
            value: "Ano"
          });
        }
      });

      if (pricedSelections.length > 0) {
        const label = field.label || sectionTitle || field.id;
        const displayValue = getFieldDisplayValue(field, pricedSelections);
        if (displayValue) {
          items.push({ label, value: displayValue });
        }
      }
      return;
    }
    
    // Handle preferred time fields - they now have their own labels
    // No special handling needed, they will be processed normally with their labels
    
    // Use the form's existing label, fallback to section title if empty
    // Special handling for zipCode: use custom label for PDF
    let label = field.label || sectionTitle || field.id;
    if (field.id === 'zipCode') {
      label = 'Lokalita úklidových prací podle PSČ';
    }
    const displayValue = getFieldDisplayValue(field, value, formData);
    
    if (displayValue) {
      items.push({ label, value: displayValue });
    }
  };
  
  // Process each form section
  formConfig.sections.forEach((section) => {
    // Validate section structure
    if (!section || !section.fields) {
      return;
    }
    
    section.fields.forEach((field) => {
      processField(field, section.title);
    });
  });
  
  return items;
}

/**
 * Gets display value for a field using its existing options or simple formatting
 * For spaceArea field, adjusts minimum hours when window cleaning is enabled
 */
function getFieldDisplayValue(field: FormField, value: unknown, formData?: FormSubmissionData): string {
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
      if (option) {
        let label = option.label;
        
        // Special handling for spaceArea: update minimum hours if window cleaning is enabled
        if (field.id === 'spaceArea' && formData?.windowCleaning === 'yes') {
          const windowCleaningHours: Record<string, number> = {
            "up-to-30": 4,
            "up-to-50": 4,
            "50-75": 5,
            "75-100": 5,
            "100-125": 6,
            "125-200": 6,
            "200-plus": 6
          };
          const correctHours = windowCleaningHours[value] || 6;
          
          // Replace the minimum hours in the label (format: "min. X hod. práce" or "min. X,5 hod. práce")
          label = label.replace(/\(min\.\s*\d+[,.]?\d*\s*hod\.\s*práce\)/i, `(min. ${correctHours} hod. práce)`);
        }
        
        return label;
      }
      return value;
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
