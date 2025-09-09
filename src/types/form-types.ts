import { z } from "zod";

export interface FormData {
  cleaningFrequency: string;
  aboveGroundFloors: number;
  undergroundFloors: number;
  apartmentsPerFloor: string;
  hasElevator: string;
  hasHotWater: string;
  generalCleaning: string;
  generalCleaningType?: string;
  windowsPerFloor?: number;
  floorsWithWindows?: string | number; // Can be "all" or number
  windowType?: string;
  basementCleaning?: string;
  winterMaintenance: string;
  communicationArea?: string;
  location: string;
  notes: string;
}

// Form configuration types
export type FieldType = 'radio' | 'select' | 'input' | 'textarea' | 'conditional' | 'checkbox';

export type NoteType = 'frequent' | 'recommended';

export interface BaseField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  icon?: string;
  description?: string;
  note?: string; // Info note to display under info icon
  placeholder?: string;
  condition?: {
    field: string;
    value: string | number | boolean;
    operator?: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_than_or_equal' | 'less_than_or_equal';
  } | {
    operator: 'and' | 'or';
    conditions: Array<{
      field: string;
      value: string | number | boolean;
      operator?: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_than_or_equal' | 'less_than_or_equal';
    }>;
  };
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: (value: unknown, formData: Record<string, unknown>) => boolean | string;
  };
}

export interface RadioField extends BaseField {
  type: 'radio';
  options: Array<{
    value: string | number;
    label: string;
    note?: NoteType; // Special note: 'frequent' or 'recommended'
    tooltip?: string; // Custom tooltip text
    coefficient?: number;
    fixedAddon?: number; // Fixed price addon in Kč
    hidden?: boolean; // Whether this option should be hidden initially
  }>;
  layout?: 'horizontal' | 'vertical';
}

export interface SelectField extends BaseField {
  type: 'select';
  options: Array<{
    value: string;
    label: string;
    note?: string; // Custom note for tooltip
    coefficient?: number;
    fixedAddon?: number; // Fixed price addon in Kč
  }>;
}

export interface InputField extends BaseField {
  type: 'input';
  inputType: 'text' | 'number' | 'email';
  min?: number;
  max?: number;
  step?: number;
}

export interface TextareaField extends BaseField {
  type: 'textarea';
  rows?: number;
}

export interface ConditionalField extends BaseField {
  type: 'conditional';
  condition: {
    field: string;
    value: string | number | boolean;
    operator?: 'equals' | 'not_equals' | 'greater_than' | 'less_than';
  } | {
    operator: 'and' | 'or';
    conditions: Array<{
      field: string;
      value: string | number | boolean;
      operator?: 'equals' | 'not_equals' | 'greater_than' | 'less_than';
    }>;
  };
  fields: FormField[];
}

export interface CheckboxField extends BaseField {
  type: 'checkbox';
  options: Array<{
    value: string;
    label: string;
    coefficient?: number;
    fixedAddon?: number; // Fixed price addon in Kč
  }>;
  layout?: 'horizontal' | 'vertical';
}

export type FormField = RadioField | SelectField | InputField | TextareaField | ConditionalField | CheckboxField;

export interface FormSection {
  id: string;
  title: string;
  icon: string;
  fields: FormField[];
  description?: string;
  note?: string;
}

export interface FormConfig {
  id: string;
  title: string;
  description: string;
  sections: FormSection[];
  validationSchema: z.ZodSchema<Record<string, unknown>>; // More specific than any
  basePrice?: number; // Base price for the service (optional, defaults to 1500)
  conditions?: string[]; // Pricing conditions (optional)
}

// Service type definitions
export interface ServiceType {
  id: string;
  title: string;
  description: string;
  icon: string;
  formConfig: FormConfig | null;
}

// Calculation result types
export interface CalculationResult {
  regularCleaningPrice: number;
  generalCleaningPrice?: number;
  generalCleaningFrequency?: string;
  totalMonthlyPrice: number;
  calculationDetails: {
    basePrice: number;
    appliedCoefficients: Array<{
      field: string;
      label: string;
      coefficient: number;
      impact: number;
    }>;
    finalCoefficient: number;
  };
}

// Form submission data type
export type FormSubmissionData = Record<string, string | number | string[] | undefined>;

// Office cleaning specific types
export interface OfficeCleaningFormData {
  cleaningFrequency: string;
  calculationMethod: string;
  hoursPerCleaning?: number;
  officeArea?: number;
  floorType: string;
  generalCleaning: string;
  generalCleaningWindows?: string;
  windowAreaBoth?: number;
  windowCountBoth?: number;
  windowAreaInside?: number;
  windowCountInside?: number;
  dishwashing: string;
  toiletCleaning: string;
  afterHours: string;
  location: string;
  notes?: string;
}

// Office cleaning calculation result
export interface OfficeCleaningCalculationResult {
  finalPrice: number;
  appliedCoefficients: Array<{
    field: string;
    label: string;
    coefficient: number;
    impact: number;
  }>;
  calculationDetails: {
    basePrice: number;
    finalCoefficient: number;
    method: string;
  };
}
