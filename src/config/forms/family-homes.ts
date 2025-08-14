import { z } from "zod";
import { FormConfig } from "@/types/form-types";

// Validation schema for family homes
const familyHomesSchema = z.object({
  // TODO: Define form fields and validation rules
  // This is a placeholder for future implementation
});

export const familyHomesFormConfig: FormConfig = {
  id: "family-homes",
  title: "Rodinné domy",
  description: "Kalkulátor úklidových služeb pro rodinné domy",
  validationSchema: familyHomesSchema,
  sections: [
    // TODO: Define form sections and fields
    // This will be implemented when the form requirements are defined
  ]
};
