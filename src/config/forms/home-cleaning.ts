import { z } from "zod";
import { FormConfig } from "@/types/form-types";

// Base prices and inflation
const BASE_PRICES = {
  monthlyTariff: 3420, // Base price per month for monthly tariff
  hourlyRate: 320, // Base hourly rate for hourly pricing
};

const INFLATION_RATE = 0.04; // 4% annual inflation
const INFLATION_START_YEAR = 2026;

// Calculate inflation-adjusted prices
function getInflationAdjustedPrice(basePrice: number, targetYear: number = new Date().getFullYear()): number {
  if (targetYear < INFLATION_START_YEAR) return basePrice;
  const yearsDiff = targetYear - INFLATION_START_YEAR;
  return basePrice * Math.pow(1 + INFLATION_RATE, yearsDiff);
}

// Get current year's prices
const currentYear = new Date().getFullYear();
const CURRENT_PRICES = {
  monthlyTariff: getInflationAdjustedPrice(BASE_PRICES.monthlyTariff, currentYear),
  hourlyRate: getInflationAdjustedPrice(BASE_PRICES.hourlyRate, currentYear),
};

// Validation schema
const homeCleaningSchema = z.object({
  pricingType: z.string().min(1, "Vyberte způsob výpočtu ceny"),
  cleaningFrequency: z.string().optional(),
  cleaningDays: z.array(z.string()).optional(),
  homeArea: z.string().min(1, "Vyberte orientační plochu prostor domácnosti"),
  domesticAnimals: z.string().min(1, "Vyberte, zda máte domácí zvířata"),
  zipCode: z.string().min(1, "Zadejte PSČ").regex(/^\d{5}$/, "PSČ musí mít přesně 5 čísel"),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  // Validate cleaning frequency and days only for monthly pricing
  if (data.pricingType === "monthly") {
    if (!data.cleaningFrequency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vyberte četnost úklidu domácnosti",
        path: ["cleaningFrequency"]
      });
    }
    
    // Validate cleaning days selection based on frequency
    const frequencyRequiresDays = ["weekly", "twice-weekly", "biweekly"];
    if (data.cleaningFrequency && frequencyRequiresDays.includes(data.cleaningFrequency)) {
      if (!data.cleaningDays || data.cleaningDays.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Vyberte preferované dny v týdnu pro úklid",
          path: ["cleaningDays"]
        });
      } else if (data.cleaningDays.includes("no-preference")) {
        // If "no preference" is selected, it's valid regardless of other selections
        // No additional validation needed
      }
      // Note: Day count validation is handled by the universal form component
    }
  }
});

export const homeCleaningFormConfig: FormConfig = {
  id: "home-cleaning",
  title: "Pravidelný úklid domácností",
  description: `Vyplňte údaje pro výpočet ceny úklidových služeb pro domácnosti. Všechny údaje jsou povinné.`,
  validationSchema: homeCleaningSchema,
  basePrice: CURRENT_PRICES.monthlyTariff, // Default to monthly tariff, will be overridden based on pricingType
  conditions: [
    "Zajištění dostatečných úklidových prostředků a úklidového náčiní (včetně vysavače, pokud je to potřeba) objednatelem"
  ],
  sections: [
    {
      id: "pricing-type",
      title: "Způsob výpočtu ceny",
      icon: "Calculator",
      fields: [
        {
          id: "pricingType",
          type: "radio",
          label: "",
          required: true,
          layout: "vertical",
          options: [
            { value: "monthly", label: "Chci znát měsíční tarif", tooltip: "Mám zájem o úklid vždy v pravidelný čas v pravidelný den týdnu.", coefficient: 1.0 },
            { value: "hourly", label: "Chci znát hodinovou sazbu", tooltip: "Čas úklidu a den v týdnu se mění dle aktuální potřeby — vždy po předchozí domluvě s pracovníkem úklidu.", coefficient: 1.0 }
          ]
        }
      ]
    },
    {
      id: "cleaning-frequency",
      title: "Četnost úklidu domácnosti",
      icon: "Calendar",
      condition: { field: "pricingType", value: "monthly" },
      fields: [
        {
          id: "cleaningFrequency",
          type: "radio",
          label: "",
          required: true,
          layout: "vertical",
          options: [
            { value: "weekly", label: "1x týdně", coefficient: 1.0 },
            { value: "twice-weekly", label: "2x týdně", coefficient: 1.67 },
            { value: "biweekly", label: "1x za 14 dní", coefficient: 0.75 },
            { value: "monthly", label: "1x měsíčně", coefficient: 0.66, hidden: true }
          ]
        },
        {
          id: "cleaningDays",
          type: "checkbox",
          label: "Vyberte preferované dny v týdnu pro úklid",
          required: true,
          condition: {
            operator: "or",
            conditions: [
              { field: "cleaningFrequency", value: "weekly", operator: "equals" },
              { field: "cleaningFrequency", value: "twice-weekly", operator: "equals" },
              { field: "cleaningFrequency", value: "biweekly", operator: "equals" }
            ]
          },
          options: [
            { value: "no-preference", label: "Bez preferencí" },
            { value: "monday", label: "Pondělí" },
            { value: "tuesday", label: "Úterý" },
            { value: "wednesday", label: "Středa" },
            { value: "thursday", label: "Čtvrtek" },
            { value: "friday", label: "Pátek" },
            { value: "saturday", label: "Sobota" },
            { value: "sunday", label: "Neděle" }
          ]
        }
      ]
    },
    {
      id: "home-area",
      title: "Orientační plocha prostor domácnosti",
      icon: "Square",
      fields: [
        {
          id: "homeArea",
          type: "radio",
          label: "",
          required: true,
          layout: "vertical",
          options: [
            { value: "up-to-30", label: "Do 30 m² (délka úklidu cca 1,5 hod.)", coefficient: 0.5 },
            { value: "up-to-50", label: "Do 50 m² (délka úklidu cca 2 hod.)", coefficient: 0.75 },
            { value: "50-75", label: "Od 50 do 75 m² (délka úklidu cca 2,5 hod.)", coefficient: 0.833 },
            { value: "75-100", label: "Od 75 do 100 m² (délka úklidu cca 3 hod.)", coefficient: 1.0 },
            { value: "100-125", label: "Od 100 do 125 m² (délka úklidu cca 3 hod.)", coefficient: 1.0 },
            { value: "125-200", label: "Od 125 do 200 m² (délka úklidu cca 4 hod.)", coefficient: 1.33 },
            { value: "200-plus", label: "Od 200 a více m² (délka úklidu cca 4 hod.)", coefficient: 1.33 }
          ]
        }
      ]
    },
    {
      id: "domestic-animals",
      title: "Domácí zvířata v domácnosti",
      icon: "Heart",
      fields: [
        {
          id: "domesticAnimals",
          type: "radio",
          label: "",
          required: true,
          layout: "vertical",
          options: [
            { value: "no", label: "Ne", coefficient: 0.98 },
            { value: "yes", label: "Ano", coefficient: 1.05 }
          ]
        }
      ]
    },
    {
      id: "location",
      title: "Lokalita",
      icon: "MapPin",
      fields: [
        {
          id: "zipCode",
          type: "input",
          label: "Zadejte PSČ",
          required: true,
          inputType: "text",
          placeholder: "12345"
        }
      ]
    },
    {
      id: "notes",
      title: "Poznámka",
      icon: "Info",
      fields: [
        {
          id: "notes",
          type: "textarea",
          label: "",
          required: false,
          rows: 4,
          placeholder: "Zde můžete napsat další poznámky nebo požadavky..."
        }
      ]
    }
  ]
};

// Export the calculation functions and prices for use in the calculation logic
export { BASE_PRICES, CURRENT_PRICES, getInflationAdjustedPrice, INFLATION_RATE, INFLATION_START_YEAR };
