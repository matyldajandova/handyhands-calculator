/**
 * Reconstructs calculationDetails from formData and formConfig
 * This allows us to remove calculationDetails from the hash and rebuild it when needed
 */

import { CalculationResult, FormConfig, FormSubmissionData, CheckboxField, RadioField, SelectField, FormField } from "@/types/form-types";

/**
 * Find a field in the form config by ID
 */
function findFieldInConfig(config: FormConfig, fieldId: string): FormField | null {
  for (const section of config.sections || []) {
    for (const field of section.fields || []) {
      if (field.id === fieldId) {
        return field;
      }
      // Check conditional fields
      if (field.type === 'conditional' && 'fields' in field) {
        for (const subField of field.fields || []) {
          if (subField.id === fieldId) {
            return subField;
          }
        }
      }
    }
  }
  return null;
}

/**
 * Get field label from form config
 */
function getFieldLabel(config: FormConfig, fieldId: string, value?: string | number | string[]): string {
  const field = findFieldInConfig(config, fieldId);
  if (!field) return fieldId;
  
  // For checkbox fields, get the specific option labels
  if (field.type === 'checkbox' && Array.isArray(value)) {
    const checkboxField = field as CheckboxField;
    return value.map(v => {
      const option = checkboxField.options.find(opt => opt.value === v);
      return option?.label || v;
    }).join(", ");
  }
  
  // For radio/select fields, get the specific option label
  if ((field.type === 'radio' || field.type === 'select') && value) {
    const optionField = field as RadioField | SelectField;
    const option = optionField.options.find(opt => opt.value === value);
    return option?.label || field.label || fieldId;
  }
  
  return field.label || fieldId;
}

/**
 * Get coefficient from form config
 */
function getCoefficientFromConfig(config: FormConfig, fieldId: string, value: string | number | string[]): number {
  const field = findFieldInConfig(config, fieldId);
  if (!field) return 1.0;

  if (field.type === 'radio' || field.type === 'select') {
    const optionField = field as RadioField | SelectField;
    const option = optionField.options.find(opt => opt.value === value);
    return option?.coefficient ?? 1.0;
  }

  if (field.type === 'checkbox' && Array.isArray(value)) {
    const checkboxField = field as CheckboxField;
    let totalCoefficient = 1.0;
    for (const v of value) {
      const option = checkboxField.options.find(opt => opt.value === v);
      if (option?.coefficient) {
        totalCoefficient *= option.coefficient;
      }
    }
    return totalCoefficient;
  }

  return 1.0;
}

/**
 * Get fixed addon from form config
 */
function getFixedAddonFromConfig(config: FormConfig, fieldId: string, value: string | number | string[]): number {
  const field = findFieldInConfig(config, fieldId);
  if (!field) return 0;

  if (field.type === 'radio' || field.type === 'select') {
    const optionField = field as RadioField | SelectField;
    const option = optionField.options.find(opt => opt.value === value);
    return option?.fixedAddon ?? 0;
  }

  if (field.type === 'checkbox' && Array.isArray(value)) {
    const checkboxField = field as CheckboxField;
    let totalFixedAddon = 0;
    for (const v of value) {
      const option = checkboxField.options.find(opt => opt.value === v);
      if (option?.fixedAddon) {
        totalFixedAddon += option.fixedAddon;
      }
    }
    return totalFixedAddon;
  }

  return 0;
}

/**
 * Reconstruct calculationDetails from formData and formConfig
 * This mimics the logic from calculation.ts but only reconstructs the details structure
 */
export function reconstructCalculationDetails(
  formData: FormSubmissionData,
  formConfig: FormConfig,
  calculationResult: Partial<CalculationResult>
): CalculationResult['calculationDetails'] {
  // Use the base price from the calculation result if available, otherwise from config
  const basePrice = calculationResult.calculationDetails?.basePrice ?? formConfig.basePrice ?? 1500;
  
  let finalCoefficient = 1.0;
  const appliedCoefficients: Array<{
    field: string;
    label: string;
    coefficient: number;
    impact: number;
  }> = [];

  // Filter out boolean values for calculation
  const calculationData = Object.fromEntries(
    Object.entries(formData).filter(([, value]) => typeof value !== 'boolean')
  ) as Record<string, string | number | string[] | undefined>;

  // Fields that should only affect general cleaning, not regular cleaning
  const generalCleaningOnlyFields = [
    'windowsPerFloor',
    'floorsWithWindows',
    'windowType',
    'generalCleaningType',
    'basementCleaningDetails'
  ];

  const excludeGeneralFieldsFromRegular = formConfig.id === "residential-building";
  const isHourlyService = formConfig.id === "one-time-cleaning" || formConfig.id === "handyman-services";

  for (const [fieldId, value] of Object.entries(calculationData)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    // Skip basementCleaning in the general coefficient loop ONLY for residential buildings
    if (formConfig.id === 'residential-building' && fieldId === 'basementCleaning') {
      continue;
    }

    // Skip general cleaning specific fields from regular cleaning
    if (excludeGeneralFieldsFromRegular && generalCleaningOnlyFields.includes(fieldId)) {
      continue;
    }

    const coefficient = getCoefficientFromConfig(formConfig, fieldId, value);
    const fixedAddon = getFixedAddonFromConfig(formConfig, fieldId, value);

    // For hourly services, exclude space area coefficient from hourly rate calculation
    const isSpaceAreaField = fieldId === "spaceArea" || fieldId === "roomCount";

    // Apply coefficient if it's different from 1.0 (has an effect)
    if (coefficient !== 1.0) {
      // For hourly services, don't apply space area coefficient to hourly rate
      if (!(isHourlyService && isSpaceAreaField)) {
        finalCoefficient *= coefficient;
      }

      appliedCoefficients.push({
        field: fieldId,
        label: getFieldLabel(formConfig, fieldId, value),
        coefficient,
        impact: (coefficient - 1) * 100
      });
    }

    // Add fixed addon if present (coefficient is 1, but impact is the fixed addon amount)
    if (fixedAddon > 0) {
      appliedCoefficients.push({
        field: fieldId,
        label: getFieldLabel(formConfig, fieldId, value),
        coefficient: 1,
        impact: fixedAddon
      });
    }
  }

  return {
    basePrice,
    appliedCoefficients,
    finalCoefficient
  };
}

/**
 * Ensure calculationDetails exists in calculationData by reconstructing if missing
 */
export async function ensureCalculationDetails(
  calculationData: Partial<CalculationResult> & { formData?: Record<string, unknown> },
  formConfig: FormConfig
): Promise<CalculationResult> {
  // If calculationDetails already exists and is complete, use it
  if (calculationData.calculationDetails?.appliedCoefficients && calculationData.calculationDetails.appliedCoefficients.length > 0) {
    return calculationData as CalculationResult;
  }

  // Otherwise, reconstruct it
  if (!calculationData.formData) {
    throw new Error('formData is required to reconstruct calculationDetails');
  }

  const reconstructedDetails = reconstructCalculationDetails(
    calculationData.formData as FormSubmissionData,
    formConfig,
    calculationData
  );

  return {
    regularCleaningPrice: calculationData.regularCleaningPrice ?? 0,
    generalCleaningPrice: calculationData.generalCleaningPrice,
    generalCleaningFrequency: calculationData.generalCleaningFrequency,
    totalMonthlyPrice: calculationData.totalMonthlyPrice ?? 0,
    hourlyRate: calculationData.hourlyRate,
    winterServiceFee: calculationData.winterServiceFee,
    winterCalloutFee: calculationData.winterCalloutFee,
    orderId: calculationData.orderId,
    calculationDetails: reconstructedDetails
  };
}

