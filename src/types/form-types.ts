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
  floorsWithWindows?: string;
  windowType?: string;
  basementCleaning?: string;
  winterMaintenance: string;
  communicationArea?: string;
  location: string;
  notes: string;
}

// Form configuration types
export type FieldType = 'radio' | 'select' | 'input' | 'textarea' | 'conditional';

export type NoteType = 'frequent' | 'recommended';

export interface BaseField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  icon?: string;
  description?: string;
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: (value: any, formData: any) => boolean | string;
  };
}

export interface RadioField extends BaseField {
  type: 'radio';
  options: Array<{
    value: string | number;
    label: string;
    note?: NoteType;
    coefficient?: number;
  }>;
  layout?: 'horizontal' | 'vertical';
}

export interface SelectField extends BaseField {
  type: 'select';
  options: Array<{
    value: string;
    label: string;
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
  };
  fields: FormField[];
}

export type FormField = RadioField | SelectField | InputField | TextareaField | ConditionalField;

export interface FormSection {
  id: string;
  title: string;
  icon: string;
  fields: FormField[];
  description?: string;
}

export interface FormConfig {
  id: string;
  title: string;
  description: string;
  sections: FormSection[];
  validationSchema: any; // Zod schema
}

// Service type definitions
export interface ServiceType {
  id: string;
  title: string;
  description: string;
  icon: string;
  formConfig: FormConfig | null;
}
