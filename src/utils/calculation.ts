import { FormSubmissionData, FormConfig, FormField, RadioField, SelectField, CheckboxField, CalculationResult } from "@/types/form-types";
import { generateOrderId } from "@/services/order-id-service";
import { calculateOfficeCleaningPrice } from "./office-cleaning-calculation";
import { FIXED_PRICES, getGeneralCleaningPrice } from "@/config/forms/residential-building";
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
  // Generate order ID for this calculation
  const orderId = generateOrderId();
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
      orderId,
      calculationDetails: {
        basePrice: officeResult.calculationDetails.basePrice,
        appliedCoefficients: officeResult.appliedCoefficients,
        finalCoefficient: officeResult.calculationDetails.finalCoefficient
      }
    };
  }



  // Determine base price based on form type and pricing type
  let basePrice = formConfig.basePrice || 1500; // Default base price
  
  // For home cleaning, use different base price based on pricing type
  if (formConfig.id === "home-cleaning" && formData.pricingType) {
    if (formData.pricingType === "monthly") {
      basePrice = 3420; // Monthly tariff base price
    } else if (formData.pricingType === "hourly") {
      basePrice = 320; // Hourly rate base price
    }
  }
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
      const coefficient = getCoefficientFromConfig(formConfig, fieldId, value);
      const fixedAddon = getFixedAddonFromConfig(formConfig, fieldId, value);
      
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
    // For residential buildings with separate general cleaning prices
    const baseGeneralPrice = getGeneralCleaningPrice(formData.generalCleaningType as string);
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

    if (calculationData.basementCleaningDetails) {
      const basementDetailsCoefficient = getCoefficientFromConfig(formConfig, 'basementCleaningDetails', calculationData.basementCleaningDetails);
      generalCoefficient *= basementDetailsCoefficient;
    }

    generalCleaningPrice = Math.round(baseGeneralPrice * generalCoefficient * 10) / 10;
    
    // Set frequency based on type
    if (formData.generalCleaningType === 'standard') {
      generalCleaningFrequency = '2x ročně';
    } else if (formData.generalCleaningType === 'annual') {
      generalCleaningFrequency = '1x ročně';
    } else if (formData.generalCleaningType === 'quarterly') {
      generalCleaningFrequency = '4x ročně';
    }
  }

  // Add winter service fee if winter maintenance is selected
  // Note: Fee is only charged during winter period (Nov 15 - Mar 14), but we always show it when selected
  let winterServiceFee = 0;
  let winterCalloutFee = 0;
  const isWinterPeriod = isWinterMaintenancePeriod();
  
  if (formData.winterMaintenance === "yes") {
    // Winter service fee is a fixed price (not affected by inflation or coefficients)
    winterServiceFee = FIXED_PRICES.winterService;
    winterCalloutFee = FIXED_PRICES.winterCallout;
    
    // Note: Winter fees are shown separately, not added to appliedCoefficients or totalMonthlyPrice
  }

  // Add fixed regional fees for one-time cleaning, home cleaning (hourly only) and handyman services
  // These are added ON TOP of the calculated price (which already includes regional coefficients)
  let regionalFixedFee = 0;
  
  // Determine if this service should get a fixed regional fee
  const shouldApplyFixedFee = 
    (formConfig.id === "one-time-cleaning" || formConfig.id === "handyman-services") ||
    (formConfig.id === "home-cleaning" && formData.pricingType === "hourly");
  
  if (shouldApplyFixedFee && formData.zipCode && typeof formData.zipCode === 'string') {
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

  // Calculate total monthly price
  // Note: regularCleaningPrice already includes regional coefficients applied to base price
  // regionalFixedFee is added on top as a fixed amount (not affected by coefficients or inflation)
  // winterServiceFee and generalCleaningPrice are shown separately and NOT included in monthly price
  const totalMonthlyPrice = regularCleaningPrice + regionalFixedFee;

  return {
    regularCleaningPrice,
    generalCleaningPrice,
    generalCleaningFrequency,
    totalMonthlyPrice,
    winterServiceFee: winterServiceFee > 0 ? winterServiceFee : undefined,
    winterCalloutFee: winterCalloutFee > 0 ? winterCalloutFee : undefined,
    orderId,
    calculationDetails: {
      basePrice,
      appliedCoefficients,
      finalCoefficient
    }
  };
}
