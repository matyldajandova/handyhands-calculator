# Modular Form System Documentation

## Overview

The Handy Hands Calculator now uses a modular, configuration-driven form system that makes it easy to create and maintain multiple forms. Instead of having separate components for each form type, all forms are defined as JSON configuration objects and rendered by a single, reusable `UniversalForm` component.

## Architecture

### Core Components

1. **`UniversalForm`** (`src/components/universal-form.tsx`)
   - Renders any form based on a configuration object
   - Handles all form logic, validation, and error handling
   - Supports all field types: radio, select, input, textarea, conditional

2. **Form Configuration Types** (`src/types/form-types.ts`)
   - Defines the structure for form configurations
   - Includes field types, validation schemas, and service definitions

3. **Service Configuration** (`src/config/services.ts`)
   - Centralized list of all available services
   - Maps service IDs to form configurations

### Form Configuration Structure

Each form is defined as a `FormConfig` object with:

```typescript
interface FormConfig {
  id: string;                    // Unique form identifier
  title: string;                 // Form title displayed to user
  description: string;           // Form description
  sections: FormSection[];       // Array of form sections
  validationSchema: any;         // Zod validation schema
}
```

Each section contains:
```typescript
interface FormSection {
  id: string;                    // Section identifier
  title: string;                 // Section title
  icon: string;                  // Icon name from lucide-react
  fields: FormField[];           // Array of form fields
  description?: string;          // Optional section description
}
```

## Field Types

### Radio Fields
```typescript
{
  id: "cleaningFrequency",
  type: "radio",
  label: "Četnost úklidu domu",
  required: true,
  layout: "vertical", // or "horizontal"
  options: [
    { value: "weekly", label: "1x týdně", note: "Nejběžnější" },
    { value: "biweekly", label: "1x za 14 dní", note: "Doporučeno" }
  ]
}
```

### Select Fields
```typescript
{
  id: "location",
  type: "select",
  label: "Lokalita",
  required: true,
  options: [
    { value: "prague", label: "Praha" },
    { value: "brno", label: "Brno" }
  ]
}
```

### Input Fields
```typescript
{
  id: "communicationArea",
  type: "input",
  label: "Plocha komunikací",
  required: false,
  inputType: "number",
  min: 0.1,
  step: 0.1,
  placeholder: "např. 150 m²"
}
```

### Textarea Fields
```typescript
{
  id: "notes",
  type: "textarea",
  label: "Poznámka",
  required: false,
  rows: 4,
  placeholder: "Zde můžete napsat další poznámky..."
}
```

### Conditional Fields
```typescript
{
  id: "general-cleaning-details",
  type: "conditional",
  label: "Detaily generálního úklidu",
  required: false,
  condition: { field: "generalCleaning", value: "yes" },
  fields: [
    // Array of fields that only show when condition is met
  ]
}
```

## Creating a New Form

### Step 1: Create Form Configuration

Create a new file in `src/config/forms/`:

```typescript
// src/config/forms/office-buildings.ts
import { z } from "zod";
import { FormConfig } from "@/types/form-types";

const officeBuildingsSchema = z.object({
  buildingType: z.string().min(1, "Vyberte typ budovy"),
  floors: z.number().min(1, "Vyberte počet pater"),
  // ... more validation rules
});

export const officeBuildingsFormConfig: FormConfig = {
  id: "office-buildings",
  title: "Kancelářské budovy",
  description: "Kalkulátor úklidových služeb pro kancelářské prostory",
  validationSchema: officeBuildingsSchema,
  sections: [
    {
      id: "building-info",
      title: "Informace o budově",
      icon: "Building2",
      fields: [
        {
          id: "buildingType",
          type: "radio",
          label: "Typ kancelářské budovy",
          required: true,
          layout: "vertical",
          options: [
            { value: "small", label: "Malá kancelář (do 100m²)" },
            { value: "medium", label: "Střední kancelář (100-500m²)" },
            { value: "large", label: "Velká kancelář (nad 500m²)" }
          ]
        }
        // ... more fields
      ]
    }
    // ... more sections
  ]
};
```

### Step 2: Add to Services Configuration

Update `src/config/services.ts`:

```typescript
import { officeBuildingsFormConfig } from "./forms/office-buildings";

export const serviceTypes: ServiceType[] = [
  // ... existing services
  {
    id: "c",
    title: "Kancelářské budovy",
    description: "Kalkulátor úklidových služeb pro kancelářské prostory",
    icon: "Building2",
    formConfig: officeBuildingsFormConfig
  },
  // ... more services
];
```

### Step 3: Test the Form

The form will automatically be available in the service selector and will render with all the same functionality as existing forms.

## Benefits of the New System

### 1. **Consistency**
- All forms use the same UI components and behavior
- Consistent error handling and validation
- Uniform styling and animations

### 2. **Maintainability**
- Single source of truth for form logic
- Easy to update common functionality across all forms
- Centralized validation and error handling

### 3. **Scalability**
- Adding new forms requires only configuration files
- No need to create new React components
- Easy to maintain multiple form types

### 4. **Developer Experience**
- Clear separation of concerns
- Type-safe configuration with TypeScript
- Easy to understand and modify

### 5. **Reusability**
- Form components can be reused across different projects
- Configuration can be easily shared or versioned
- Consistent API for form handling

## Migration from Old System

The old component-based forms (`ResidentialBuildingForm`, `GeneralCleaningSection`, etc.) have been replaced by the new configuration-driven system. The new system provides the exact same functionality but with better maintainability.

## Future Enhancements

1. **Form Builder UI**: Visual form builder for non-developers
2. **Dynamic Validation**: Runtime validation rule updates
3. **Form Templates**: Pre-built form configurations for common use cases
4. **Multi-language Support**: Internationalization for form labels and messages
5. **Form Analytics**: Track form usage and completion rates

## Troubleshooting

### Common Issues

1. **Icon Not Displaying**: Ensure the icon name matches exactly with lucide-react exports
2. **Validation Errors**: Check that the Zod schema matches the form structure
3. **Conditional Fields Not Showing**: Verify the condition field and value match exactly

### Debug Tips

1. Check the browser console for validation errors
2. Verify form configuration structure matches the TypeScript interfaces
3. Ensure all required fields have proper validation rules
4. Test conditional logic with different form values
