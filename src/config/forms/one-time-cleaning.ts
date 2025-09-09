import { z } from "zod";
import { FormConfig } from "@/types/form-types";

// Base prices and inflation
const BASE_PRICES = {
  hourlyRate: 345, // Base hourly rate for one-time cleaning
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
  hourlyRate: getInflationAdjustedPrice(BASE_PRICES.hourlyRate, currentYear),
};

// Area-based minimum hours and prices
const AREA_MINIMUMS = {
  "up-to-30": { hours: 3, minPrice: 1035 },
  "up-to-50": { hours: 3.5, minPrice: 1208 },
  "50-75": { hours: 4, minPrice: 1380 },
  "75-100": { hours: 4, minPrice: 1380 },
  "100-125": { hours: 4, minPrice: 1380 },
  "125-200": { hours: 4, minPrice: 1380 },
  "200-plus": { hours: 4, minPrice: 1380 }
};

// Validation schema
const oneTimeCleaningSchema = z.object({
  spaceArea: z.string().min(1, "Vyberte orientační plochu prostor určených k úklidu"),
  cleaningSupplies: z.string().min(1, "Vyberte úklidové náčiní a úklidovou chemii"),
  zipCode: z.string().min(1, "Zadejte PSČ").regex(/^\d{5}$/, "PSČ musí mít přesně 5 čísel"),
  notes: z.string().optional(),
});

export const oneTimeCleaningFormConfig: FormConfig = {
  id: "one-time-cleaning",
  title: "Jednorázový úklid",
  description: `Vyplňte údaje pro výpočet ceny jednorázového úklidu. Všechny údaje jsou povinné. Ceny jsou aktualizovány s inflací ${(INFLATION_RATE * 100).toFixed(1)}% od roku ${INFLATION_START_YEAR}.`,
  validationSchema: oneTimeCleaningSchema,
  basePrice: CURRENT_PRICES.hourlyRate,
  conditions: [],
  sections: [
    {
      id: "space-area",
      title: "Orientační plocha prostor určených k úklidu",
      icon: "Square",
      fields: [
        {
          id: "spaceArea",
          type: "radio",
          label: "",
          required: true,
          layout: "vertical",
          options: [
            { value: "up-to-30", label: "Do 30 m² (min 3 hod.)", coefficient: 3.0 },
            { value: "up-to-50", label: "Do 50 m² (min 3,5 hod.)", coefficient: 3.5 },
            { value: "50-75", label: "Od 50 do 75 m² (min 4 hod.)", coefficient: 4.0 },
            { value: "75-100", label: "Od 75 do 100 m² (min 4 hod.)", coefficient: 4.0 },
            { value: "100-125", label: "Od 100 do 125 m² (min 4 hod.)", coefficient: 4.0 },
            { value: "125-200", label: "Od 125 do 200 m² (min 4 hod.)", coefficient: 4.0 },
            { value: "200-plus", label: "Od 200 a více m² (min 4 hod.)", coefficient: 4.0 }
          ]
        }
      ]
    },
    {
      id: "cleaning-supplies",
      title: "Úklidové náčiní a úklidová chemie",
      icon: "Droplets",
      fields: [
        {
          id: "cleaningSupplies",
          type: "radio",
          label: "",
          required: true,
          layout: "vertical",
          options: [
            { value: "worker-brings", label: "Přiveze pracovník úklidu (+500 Kč)", fixedAddon: 500, note: "recommended" },
            { value: "own-vacuum", label: "K úklidu je potřeba vlastní vysavač (+250 Kč)", fixedAddon: 250 },
            { value: "own-supplies", label: "Mám vlastní odpovídající úklidové náčiní a úklidovou chemii", fixedAddon: 0 }
          ]
        }
      ]
    },
    {
      id: "location-transport",
      title: "Lokalita a doprava",
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
          placeholder: "Zde můžete napsat další poznámky nebo specifické požadavky na úklid..."
        }
      ]
    }
  ]
};

// Export the calculation functions and prices for use in the calculation logic
export { BASE_PRICES, CURRENT_PRICES, getInflationAdjustedPrice, INFLATION_RATE, INFLATION_START_YEAR, AREA_MINIMUMS };
