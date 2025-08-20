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
  location: z.string().min(1, "Vyberte lokalitu"),
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
          id: "location",
          type: "select",
          label: "",
          required: true,
          options: [
            { value: "prague", label: "Praha (+ doprava 250 Kč)", coefficient: 1.0, fixedAddon: 250 },
            { value: "stredocesky", label: "Středočeský kraj (+ doprava 225 Kč)", coefficient: 0.96078, fixedAddon: 225 },
            { value: "karlovarsky", label: "Karlovarský kraj (+ doprava 200 Kč)", coefficient: 0.72549, fixedAddon: 200 },
            { value: "plzensky", label: "Plzeňský kraj (+ doprava 200 Kč)", coefficient: 0.75686, fixedAddon: 200 },
            { value: "ustecky", label: "Ústecký kraj (+ doprava 200 Kč)", coefficient: 0.69019, fixedAddon: 200 },
            { value: "jihocesky", label: "Jihočeský kraj (+ doprava 200 Kč)", coefficient: 0.75294, fixedAddon: 200 },
            { value: "liberecky", label: "Liberecký kraj (+ doprava 200 Kč)", coefficient: 0.76863, fixedAddon: 200 },
            { value: "kralovehradecky", label: "Královéhradecký kraj (+ doprava 200 Kč)", coefficient: 0.75294, fixedAddon: 200 },
            { value: "pardubicky", label: "Pardubický kraj (+ doprava 200 Kč)", coefficient: 0.75294, fixedAddon: 200 },
            { value: "vysocina", label: "Kraj Vysočina (+ doprava 200 Kč)", coefficient: 0.68235, fixedAddon: 200 },
            { value: "jihomoravsky", label: "Jihomoravský kraj (+ doprava 225 Kč)", coefficient: 0.82352, fixedAddon: 200 },
            { value: "olomoucky", label: "Olomoucký kraj (+ doprava 200 Kč)", coefficient: 0.71372, fixedAddon: 200 },
            { value: "zlinsky", label: "Zlínský kraj (+ doprava 200 Kč)", coefficient: 0.71372, fixedAddon: 200 },
            { value: "moravskoslezsky", label: "Moravskoslezský kraj (+ doprava 200 Kč)", coefficient: 0.65098, fixedAddon: 200 }
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
          placeholder: "Zde můžete napsat další poznámky nebo specifické požadavky na úklid..."
        }
      ]
    }
  ]
};

// Export the calculation functions and prices for use in the calculation logic
export { BASE_PRICES, CURRENT_PRICES, getInflationAdjustedPrice, INFLATION_RATE, INFLATION_START_YEAR, AREA_MINIMUMS };
