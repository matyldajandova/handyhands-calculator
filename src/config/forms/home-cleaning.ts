import { z } from "zod";
import { FormConfig } from "@/types/form-types";

// Base prices and inflation
const BASE_PRICES = {
  regularCleaning: 2450, // Base price per month for regular home cleaning
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
  regularCleaning: getInflationAdjustedPrice(BASE_PRICES.regularCleaning, currentYear),
};

// Validation schema
const homeCleaningSchema = z.object({
  cleaningFrequency: z.string().min(1, "Vyberte četnost úklidu domácnosti"),
  homeArea: z.string().min(1, "Vyberte orientační plochu prostor domácnosti"),
  location: z.string().min(1, "Vyberte lokalitu"),
  notes: z.string().optional(),
});

export const homeCleaningFormConfig: FormConfig = {
  id: "home-cleaning",
  title: "Pravidelný úklid domácností",
  description: `Vyplňte údaje pro výpočet ceny úklidových služeb pro domácnosti. Všechny údaje jsou povinné. Ceny jsou aktualizovány s inflací ${(INFLATION_RATE * 100).toFixed(1)}% od roku ${INFLATION_START_YEAR}.`,
  validationSchema: homeCleaningSchema,
  basePrice: CURRENT_PRICES.regularCleaning,
  conditions: [
    "Dostupnost alespoň studené vody v domácnosti",
    "Uzamykatelná místnost nebo místo na úklidové náčiní a úklidovou chemii"
  ],
  sections: [
    {
      id: "cleaning-frequency",
      title: "Četnost úklidu domácnosti",
      icon: "Calendar",
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
            { value: "monthly", label: "1x měsíčně", coefficient: 0.66 }
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
            { value: "up-to-30", label: "Do 30 m²", coefficient: 0.65 },
            { value: "up-to-50", label: "Do 50 m²", coefficient: 0.73 },
            { value: "50-75", label: "Od 50 do 75 m²", coefficient: 0.91 },
            { value: "75-100", label: "Od 75 do 100 m²", coefficient: 1.0 },
            { value: "100-125", label: "Od 100 do 125 m²", coefficient: 1.1 },
            { value: "125-200", label: "Od 125 do 200 m²", coefficient: 1.3 },
            { value: "200-plus", label: "Od 200 a více m²", coefficient: 1.6 }
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
          id: "location",
          type: "select",
          label: "",
          required: true,
          options: [
            { value: "prague", label: "Praha", coefficient: 1.0 },
            { value: "stredocesky", label: "Středočeský kraj", coefficient: 0.96078 },
            { value: "karlovarsky", label: "Karlovarský kraj", coefficient: 0.72549 },
            { value: "plzensky", label: "Plzeňský kraj", coefficient: 0.75686 },
            { value: "ustecky", label: "Ústecký kraj", coefficient: 0.69019 },
            { value: "jihocesky", label: "Jihočeský kraj", coefficient: 0.75294 },
            { value: "liberecky", label: "Liberecký kraj", coefficient: 0.76863 },
            { value: "kralovehradecky", label: "Královéhradecký kraj", coefficient: 0.75294 },
            { value: "pardubicky", label: "Pardubický kraj", coefficient: 0.75294 },
            { value: "vysocina", label: "Kraj Vysočina", coefficient: 0.68235 },
            { value: "jihomoravsky", label: "Jihomoravský kraj", coefficient: 0.82352 },
            { value: "olomoucky", label: "Olomoucký kraj", coefficient: 0.71372 },
            { value: "zlinsky", label: "Zlínský kraj", coefficient: 0.71372 },
            { value: "moravskoslezsky", label: "Moravskoslezský kraj", coefficient: 0.65098 }
          ]
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
