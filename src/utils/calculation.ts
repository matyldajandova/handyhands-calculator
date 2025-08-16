import { FormSubmissionData, FormConfig, FormField, RadioField, SelectField, CalculationResult } from "@/types/form-types";
import { calculateOfficeCleaningPrice } from "./office-cleaning-calculation";

// Helper function to find a field in the form configuration
function findFieldInConfig(config: FormConfig, fieldId: string): FormField | null {
  for (const section of config.sections) {
    for (const field of section.fields) {
      if (field.id === fieldId) {
        return field;
      }
      // Check conditional fields
      if (field.type === 'conditional') {
        for (const subField of field.fields) {
          if (subField.id === fieldId) {
            return subField;
          }
        }
      }
    }
  }
  return null;
}

// Helper function to get coefficient from form configuration
function getCoefficientFromConfig(config: FormConfig, fieldId: string, value: string | number): number {
  const field = findFieldInConfig(config, fieldId);
  if (!field) return 1.0;

  if (field.type === 'radio') {
    const radioField = field as RadioField;
    const option = radioField.options.find(opt => opt.value === value);
    return option?.coefficient || 1.0;
  }

  if (field.type === 'select') {
    const selectField = field as SelectField;
    const option = selectField.options.find(opt => opt.value === value);
    return option?.coefficient || 1.0;
  }

  return 1.0;
}

// Main calculation function - now generic for any form configuration
export function calculatePrice(formData: FormSubmissionData, formConfig: FormConfig): CalculationResult {
  // Check if this is the office cleaning calculator
  if (formConfig.id === "office-cleaning") {
    const officeResult = calculateOfficeCleaningPrice(formData, formConfig.basePrice || 2450);
    
    // Convert office cleaning result to standard CalculationResult format
    return {
      regularCleaningPrice: officeResult.finalPrice,
      generalCleaningPrice: undefined, // Office cleaning includes general cleaning in the base price
      generalCleaningFrequency: "2x ročně", // Office cleaning includes 2x yearly general cleaning
      totalMonthlyPrice: officeResult.finalPrice,
      calculationDetails: {
        basePrice: officeResult.calculationDetails.basePrice,
        appliedCoefficients: officeResult.appliedCoefficients,
        finalCoefficient: officeResult.calculationDetails.finalCoefficient
      }
    };
  }

  const basePrice = formConfig.basePrice || 1500; // Use config base price or default to 1500
  let finalCoefficient = 1.0;
  const appliedCoefficients: Array<{
    field: string;
    label: string;
    coefficient: number;
    impact: number;
  }> = [];

  // Get field labels for better display
  function getFieldLabel(fieldId: string): string {
    const field = findFieldInConfig(formConfig, fieldId);
    return field?.label || fieldId;
  }

  // Apply coefficients for all form fields
  for (const [fieldId, value] of Object.entries(formData)) {
    if (value !== undefined && value !== null && value !== '') {
      const coefficient = getCoefficientFromConfig(formConfig, fieldId, value);
      
      // Only apply coefficient if it's different from 1.0 (has an effect)
      if (coefficient !== 1.0) {
        finalCoefficient *= coefficient;
        appliedCoefficients.push({
          field: fieldId,
          label: getFieldLabel(fieldId),
          coefficient,
          impact: (coefficient - 1) * 100
        });
      }
    }
  }

  // Calculate regular cleaning price
  const regularCleaningPrice = Math.round(basePrice * finalCoefficient * 10) / 10; // Round to 0.1 Kč

  // Calculate general cleaning price if applicable
  let generalCleaningPrice: number | undefined;
  let generalCleaningFrequency: string | undefined;

  if (formData.generalCleaning === "yes" && formData.generalCleaningType) {
    // Get base general cleaning price from config or use default
    const generalCleaningField = findFieldInConfig(formConfig, 'generalCleaningType');
    if (generalCleaningField && generalCleaningField.type === 'radio') {
      const radioField = generalCleaningField as RadioField;
      const selectedOption = radioField.options.find(opt => opt.value === formData.generalCleaningType);
      
      if (selectedOption) {
        // Extract price from label if it contains price information
        const priceMatch = selectedOption.label.match(/(\d+(?:\.\d+)?)\s*Kč/);
        if (priceMatch) {
          const baseGeneralPrice = parseFloat(priceMatch[1]);
          let generalCoefficient = 1.0;

          // Apply additional coefficients for general cleaning
          if (formData.windowsPerFloor) {
            const windowsCoefficient = getCoefficientFromConfig(formConfig, 'windowsPerFloor', formData.windowsPerFloor);
            generalCoefficient *= windowsCoefficient;
          }

          if (formData.floorsWithWindows) {
            const floorsCoefficient = getCoefficientFromConfig(formConfig, 'floorsWithWindows', formData.floorsWithWindows);
            generalCoefficient *= floorsCoefficient;
          }

          if (formData.windowType) {
            const windowTypeCoefficient = getCoefficientFromConfig(formConfig, 'windowType', formData.windowType);
            generalCoefficient *= windowTypeCoefficient;
          }

          if (formData.basementCleaning && formData.undergroundFloors && Number(formData.undergroundFloors) > 0) {
            const basementCoefficient = getCoefficientFromConfig(formConfig, 'basementCleaning', formData.basementCleaning);
            generalCoefficient *= basementCoefficient;
          }

          generalCleaningPrice = Math.round(baseGeneralPrice * generalCoefficient * 10) / 10;
          
          // Extract frequency from label
          if (selectedOption.label.includes('2x ročně')) {
            generalCleaningFrequency = '2x ročně';
          } else if (selectedOption.label.includes('1x ročně')) {
            generalCleaningFrequency = '1x ročně';
          } else if (selectedOption.label.includes('4x ročně')) {
            generalCleaningFrequency = '4x ročně';
          }
        }
      }
    }
  }

  // Calculate total monthly price
  const totalMonthlyPrice = regularCleaningPrice;

  return {
    regularCleaningPrice,
    generalCleaningPrice,
    generalCleaningFrequency,
    totalMonthlyPrice,
    calculationDetails: {
      basePrice,
      appliedCoefficients,
      finalCoefficient
    }
  };
}
