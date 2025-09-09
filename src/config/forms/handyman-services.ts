import { z } from "zod";
import { FormConfig } from "@/types/form-types";

// Base prices and inflation
const BASE_PRICES = {
  hourlyRate: 395, // Base hourly rate for handyman services
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

// Time-based minimum hours and prices
const TIME_BRACKETS = {
  "up-to-30min": { hours: 2, price: 790 },
  "30-60min": { hours: 2, price: 790 },
  "1-2hours": { hours: 2, price: 790 },
  "2-3hours": { hours: 3, price: 1185 },
  "3-5hours": { hours: 5, price: 1975 },
  "5-8hours": { hours: 8, price: 3160 },
  "over-8hours": { hours: 8, price: 3160 }
};

// Validation schema
const handymanServicesSchema = z.object({
  timeComplexity: z.string().min(1, "Vyberte orientační časovou náročnost"),
  workTools: z.string().min(1, "Vyberte pracovní náčiní"),
  zipCode: z.string().min(1, "Zadejte PSČ").regex(/^\d{5}$/, "PSČ musí mít přesně 5 čísel"),
  notes: z.string().optional(),
});

export const handymanServicesFormConfig: FormConfig = {
  id: "handyman-services",
  title: "Řemeslné služby",
  description: `Vyplňte údaje pro výpočet ceny řemeslných služeb. Všechny údaje jsou povinné. Ceny jsou aktualizovány s inflací ${(INFLATION_RATE * 100).toFixed(1)}% od roku ${INFLATION_START_YEAR}.`,
  validationSchema: handymanServicesSchema,
  basePrice: CURRENT_PRICES.hourlyRate,
  conditions: [],
  sections: [
    {
      id: "time-complexity",
      title: "Orientační časová náročnost",
      icon: "Clock",
      fields: [
        {
          id: "timeComplexity",
          type: "radio",
          label: "",
          required: true,
          layout: "vertical",
          options: [
            { value: "up-to-30min", label: "Do 30 min.", coefficient: 2.0 },
            { value: "30-60min", label: "30 až 60 min.", coefficient: 2.0 },
            { value: "1-2hours", label: "1 hod. až 2 hod.", coefficient: 2.0 },
            { value: "2-3hours", label: "2 hod. až 3 hod.", coefficient: 3.0 },
            { value: "3-5hours", label: "3 hod. až 5 hod.", coefficient: 5.0 },
            { value: "5-8hours", label: "5 hod. až 8 hod.", coefficient: 8.0 },
            { value: "over-8hours", label: "Nad 8 hod. práce", coefficient: 8.0 }
          ]
        }
      ]
    },
    {
      id: "work-tools",
      title: "Pracovní náčiní",
      icon: "Wrench",
      fields: [
        {
          id: "workTools",
          type: "radio",
          label: "",
          required: true,
          layout: "vertical",
          options: [
            { value: "worker-brings", label: "Přiveze pracovník (+500 Kč)", fixedAddon: 500, note: "recommended" },
            { value: "own-tools", label: "Mám vlastní odpovídající pracovní náčiní", fixedAddon: 0 }
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
          placeholder: "Zde můžete napsat další poznámky nebo specifické požadavky na řemeslné práce..."
        }
      ]
    }
  ]
};

// Export the calculation functions and prices for use in the calculation logic
export { BASE_PRICES, CURRENT_PRICES, getInflationAdjustedPrice, INFLATION_RATE, INFLATION_START_YEAR, TIME_BRACKETS };
