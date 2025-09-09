import { FormSubmissionData, FormConfig, FormField, RadioField, SelectField, CheckboxField, CalculationResult } from "@/types/form-types";
import { calculateOfficeCleaningPrice } from "./office-cleaning-calculation";
import { FIXED_PRICES } from "@/config/forms/residential-building";
import { isWinterMaintenancePeriod } from "./date-utils";
import { getRegionFromZipCode, getAvailableRegions } from "./zip-code-mapping";
import { getFixedFeeForService } from "./regional-fixed-fees";

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
function getCoefficientFromConfig(config: FormConfig, fieldId: string, value: string | number | string[]): number {
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

  if (field.type === 'checkbox') {
    const checkboxField = field as CheckboxField;
    if (Array.isArray(value)) {
      // For checkbox fields, multiply coefficients of all selected options
      let totalCoefficient = 1.0;
      for (const selectedValue of value) {
        const option = checkboxField.options.find(opt => opt.value === selectedValue);
        if (option?.coefficient) {
          totalCoefficient *= option.coefficient;
        }
      }
      return totalCoefficient;
    }
  }

  return 1.0;
}

// Helper function to get fixed addon from form configuration
function getFixedAddonFromConfig(config: FormConfig, fieldId: string, value: string | number | string[]): number {
  const field = findFieldInConfig(config, fieldId);
  if (!field) return 0;

  if (field.type === 'radio') {
    const radioField = field as RadioField;
    const option = radioField.options.find(opt => opt.value === value);
    return option?.fixedAddon || 0;
  }

  if (field.type === 'select') {
    const selectField = field as SelectField;
    const option = selectField.options.find(opt => opt.value === value);
    return option?.fixedAddon || 0;
  }

  if (field.type === 'checkbox') {
    const checkboxField = field as CheckboxField;
    if (Array.isArray(value)) {
      // For checkbox fields, sum fixed addons of all selected options
      let totalFixedAddon = 0;
      for (const selectedValue of value) {
        const option = checkboxField.options.find(opt => opt.value === selectedValue);
        if (option?.fixedAddon) {
          totalFixedAddon += option.fixedAddon;
        }
      }
      return totalFixedAddon;
    }
  }

  return 0;
}

// Main calculation function - now generic for any form configuration
export async function calculatePrice(formData: FormSubmissionData, formConfig: FormConfig): Promise<CalculationResult> {
  // Filter out boolean values for calculation functions that don't expect them
  const calculationData = Object.fromEntries(
    Object.entries(formData).filter(([, value]) => typeof value !== 'boolean')
  ) as Record<string, string | number | string[] | undefined>;
  // Check if this is the office cleaning calculator
  if (formConfig.id === "office-cleaning") {
    const officeResult = calculateOfficeCleaningPrice(calculationData, formConfig.basePrice || 2450);
    
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

  // Handle zip code to region mapping for all forms
  if (formData.zipCode && typeof formData.zipCode === 'string') {
    try {
      const regionKey = await getRegionFromZipCode(formData.zipCode);
      if (regionKey) {
        const regions = getAvailableRegions();
        const region = regions.find(r => r.value === regionKey);
        if (region) {
          // Apply coefficient for ALL forms (including one-time cleaning and handyman services)
          finalCoefficient *= region.coefficient;
          appliedCoefficients.push({
            field: 'zipCode',
            label: `Lokalita (${region.label})`,
            coefficient: region.coefficient,
            impact: (region.coefficient - 1) * 100
          });
        }
      } else {
        // If zip code not found, use Prague as default
        finalCoefficient *= 1.0;
        appliedCoefficients.push({
          field: 'zipCode',
          label: 'Lokalita (Praha - výchozí)',
          coefficient: 1.0,
          impact: 0
        });
      }
    } catch (error) {
      console.error('Error mapping zip code to region:', error);
      // Fallback to Prague
      finalCoefficient *= 1.0;
      appliedCoefficients.push({
        field: 'zipCode',
        label: 'Lokalita (Praha - výchozí)',
        coefficient: 1.0,
        impact: 0
      });
    }
  }

  // Get field labels for better display
  function getFieldLabel(fieldId: string): string {
    const field = findFieldInConfig(formConfig, fieldId);
    return field?.label || fieldId;
  }

  // Apply coefficients and fixed addons for all form fields
  let totalFixedAddons = 0;
  
  for (const [fieldId, value] of Object.entries(calculationData)) {
    if (value !== undefined && value !== null && value !== '') {
      let coefficient: number;
      let fixedAddon: number | undefined;
      
      coefficient = getCoefficientFromConfig(formConfig, fieldId, value);
      fixedAddon = getFixedAddonFromConfig(formConfig, fieldId, value);
      
      // Apply coefficient if it's different from 1.0 (has an effect)
      if (coefficient !== 1.0) {
        finalCoefficient *= coefficient;
        appliedCoefficients.push({
          field: fieldId,
          label: getFieldLabel(fieldId),
          coefficient,
          impact: (coefficient - 1) * 100
        });
      }
      
      // Add fixed addon if present
      if (fixedAddon && fixedAddon > 0) {
        totalFixedAddons += fixedAddon;
        appliedCoefficients.push({
          field: fieldId,
          label: getFieldLabel(fieldId),
          coefficient: 1, // Fixed addons don't affect the coefficient
          impact: fixedAddon
        });
      }
    }
  }

  // Calculate regular cleaning price (including fixed addons)
  const regularCleaningPrice = Math.round((basePrice * finalCoefficient + totalFixedAddons) * 10) / 10; // Round to 0.1 Kč

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
          if (calculationData.windowsPerFloor) {
            const windowsCoefficient = getCoefficientFromConfig(formConfig, 'windowsPerFloor', calculationData.windowsPerFloor);
            generalCoefficient *= windowsCoefficient;
          }

          if (calculationData.floorsWithWindows) {
            const floorsCoefficient = getCoefficientFromConfig(formConfig, 'floorsWithWindows', calculationData.floorsWithWindows);
            generalCoefficient *= floorsCoefficient;
          }

          if (calculationData.windowType) {
            const windowTypeCoefficient = getCoefficientFromConfig(formConfig, 'windowType', calculationData.windowType);
            generalCoefficient *= windowTypeCoefficient;
          }

          if (calculationData.basementCleaning && calculationData.undergroundFloors && Number(calculationData.undergroundFloors) > 0) {
            const basementCoefficient = getCoefficientFromConfig(formConfig, 'basementCleaning', calculationData.basementCleaning);
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

  // Add winter service fee if winter maintenance is selected AND we're in winter period
  let winterServiceFee = 0;
  if (formData.winterMaintenance === "yes" && isWinterMaintenancePeriod()) {
    // Winter service fee is a fixed price (not affected by inflation or coefficients)
    winterServiceFee = FIXED_PRICES.winterService;
    
    appliedCoefficients.push({
      field: 'winterMaintenance',
      label: 'Zimní služby (pohotovostní služba)',
      coefficient: 1,
      impact: winterServiceFee
    });
  }

  // Add fixed regional fees for one-time cleaning and handyman services
  // These are added ON TOP of the calculated price (which already includes regional coefficients)
  let regionalFixedFee = 0;
  if ((formConfig.id === "one-time-cleaning" || formConfig.id === "handyman-services") && formData.zipCode && typeof formData.zipCode === 'string') {
    try {
      const regionKey = await getRegionFromZipCode(formData.zipCode);
      if (regionKey) {
        regionalFixedFee = getFixedFeeForService(formConfig.id, regionKey);
        if (regionalFixedFee > 0) {
          appliedCoefficients.push({
            field: 'zipCode',
            label: `Doprava (${regionKey}) - pevná cena`,
            coefficient: 1,
            impact: regionalFixedFee
          });
        }
      }
    } catch (error) {
      console.error('Error getting fixed fee for region:', error);
    }
  }

  // Calculate total monthly price (including winter service fee and regional fixed fee)
  // Note: regularCleaningPrice already includes regional coefficients applied to base price
  // regionalFixedFee is added on top as a fixed amount (not affected by coefficients or inflation)
  const totalMonthlyPrice = regularCleaningPrice + winterServiceFee + regionalFixedFee;

  return {
    regularCleaningPrice,
    generalCleaningPrice,
    generalCleaningFrequency,
    totalMonthlyPrice,
    winterServiceFee: winterServiceFee > 0 ? winterServiceFee : undefined,
    calculationDetails: {
      basePrice,
      appliedCoefficients,
      finalCoefficient
    }
  };
}
