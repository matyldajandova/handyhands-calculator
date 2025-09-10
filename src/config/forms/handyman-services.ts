import { z } from "zod";
import { FormConfig } from "@/types/form-types";

// Base prices and inflation
const BASE_PRICES = {
  hourlyRate: 385, // Base hourly rate for handyman services
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
  cleaningType: z.string().min(1, "Vyberte typ čištění"),
  roomCount: z.string().min(1, "Vyberte počet místností s okny"),
  cleaningSupplies: z.array(z.string()).optional(),
  zipCode: z.string().min(1, "Zadejte PSČ").regex(/^\d{5}$/, "PSČ musí mít přesně 5 čísel"),
  notes: z.string().optional(),
});

export const handymanServicesFormConfig: FormConfig = {
  id: "handyman-services",
  title: "Mytí oken a ostatní služby",
  description: `Vyplňte údaje pro výpočet ceny mytí oken a ostatních služeb.`,
  validationSchema: handymanServicesSchema,
  basePrice: CURRENT_PRICES.hourlyRate,
  conditions: [],
  sections: [
    {
      id: "cleaning-type",
      title: "Typ čištění",
      icon: "Sparkles",
      fields: [
        {
          id: "cleaningType",
          type: "radio",
          label: "",
          required: true,
          layout: "vertical",
          options: [
            { value: "after-reconstruction", label: "Po rekonstrukci, kolaudaci", coefficient: 1.1 },
            { value: "regular-cleaning", label: "Běžné mytí", coefficient: 1.0 }
          ]
        }
      ]
    },
    {
      id: "room-count",
      title: "Orientační počet místností, kde jsou okna určená k umytí",
      icon: "Home",
      fields: [
        {
          id: "roomCount",
          type: "radio",
          label: "",
          required: true,
          layout: "vertical",
          options: [
            { value: "up-to-2", label: "Do 2 (min. 2 hod. práce)", coefficient: 2.0 },
            { value: "3", label: "3 (min. 2 hod. práce)", coefficient: 2.0 },
            { value: "4", label: "4 (min. 3 hod. práce)", coefficient: 3.0 },
            { value: "5-plus", label: "5 a více (min. 4 hod. práce)", coefficient: 4.0 }
          ]
        }
      ]
    },
    {
      id: "cleaning-supplies",
      title: "Příplatky",
      icon: "Droplets",
      fields: [
        {
          id: "cleaningSupplies",
          type: "checkbox",
          label: "",
          required: false,
          layout: "vertical",
          options: [
            { value: "cleaning-supplies", label: "Úklidové náčiní včetně spotřebního zboží (hadry, utěrky atd.) (+400 Kč)", fixedAddon: 400 },
            { value: "ladders", label: "K mytí oken jsou potřeba také štafle nebo schůdky (+250 Kč)", fixedAddon: 250 }
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
