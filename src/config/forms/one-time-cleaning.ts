import { z } from "zod";
import { FormConfig } from "@/types/form-types";

// Base prices and inflation
const BASE_PRICES = {
  hourlyRate: 335, // Base hourly rate for one-time cleaning
};

const INFLATION_RATE = 0.04; // 4% annual inflation
const INFLATION_START_YEAR = 2026;

// Calculate inflation-adjusted prices
function getInflationAdjustedPrice(basePrice: number, targetYear: number = new Date().getFullYear()): number {
  if (targetYear < INFLATION_START_YEAR) return basePrice;
  const yearsDiff = targetYear - INFLATION_START_YEAR + 1; // +1 to apply inflation starting from 2026
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
  cleaningType: z.string().min(1, "Vyberte typ jednorázového úklidu"),
  spaceArea: z.string().min(1, "Vyberte orientační plochu prostor určených k úklidu"),
  windowCleaning: z.string().min(1, "Vyberte, zda chcete umýt okna"),
  windowCleaningArea: z.string().optional(),
  cleaningSupplies: z.array(z.string()).min(1, "Vyberte úklidové náčiní a úklidovou chemii"),
  domesticAnimals: z.string().min(1, "Vyberte, zda máte domácí zvířata"),
  optionalServices: z.array(z.string()).optional(),
  zipCode: z.string().min(1, "Zadejte PSČ").regex(/^\d{5}$/, "PSČ musí mít přesně 5 čísel"),
  notes: z.string().optional(),
}).refine((data) => {
  // If window cleaning is "yes", then windowCleaningArea is required
  if (data.windowCleaning === "yes" && !data.windowCleaningArea) {
    return false;
  }
  return true;
}, {
  message: "Vyberte orientační plochu pro umývání oken",
  path: ["windowCleaningArea"],
}).refine((data) => {
  // Validate cleaning supplies exclusive selection
  const hasOwnSupplies = data.cleaningSupplies.includes("own-supplies");
  const hasOtherOptions = data.cleaningSupplies.some(supply => supply !== "own-supplies");
  
  // If "own-supplies" is selected, no other options should be selected
  if (hasOwnSupplies && hasOtherOptions) {
    return false;
  }
  return true;
}, {
  message: "Pokud máte vlastní odpovídající náčiní, nelze vybrat další možnosti",
  path: ["cleaningSupplies"],
});

export const oneTimeCleaningFormConfig: FormConfig = {
  id: "one-time-cleaning",
  title: "Jednorázový úklid",
  description: `Vyplňte údaje pro výpočet ceny jednorázového úklidu.`,
  validationSchema: oneTimeCleaningSchema,
  basePrice: CURRENT_PRICES.hourlyRate,
  conditions: [],
  sections: [
    {
      id: "cleaning-type",
      title: "Typ jednorázového úklidu",
      icon: "Sparkles",
      fields: [
        {
          id: "cleaningType",
          type: "radio",
          label: "",
          required: true,
          layout: "vertical",
          options: [
            { value: "after-reconstruction", label: "Po rekonstrukci, kolaudaci", coefficient: 1.07 },
            { value: "after-moving-out", label: "Po vystěhování (např. nájemníka)", coefficient: 1.0 },
            { value: "regular-cleaning", label: "Běžný úklid", coefficient: 0.95 }
          ]
        }
      ]
    },
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
            { value: "up-to-30", label: "Do 30 m² (min. 3 hod. práce)", coefficient: 3.0 },
            { value: "up-to-50", label: "Do 50 m² (min. 3,5 hod. práce)", coefficient: 3.5 },
            { value: "50-75", label: "Od 50 do 75 m² (min. 4 hod. práce)", coefficient: 4.0 },
            { value: "75-100", label: "Od 75 do 100 m² (min. 4 hod. práce)", coefficient: 4.0 },
            { value: "100-125", label: "Od 100 do 125 m² (min. 4 hod. práce)", coefficient: 4.0 },
            { value: "125-200", label: "Od 125 do 200 m² (min. 4 hod. práce)", coefficient: 4.0 },
            { value: "200-plus", label: "Od 200 a více m² (min. 4 hod. práce)", coefficient: 4.0 }
          ]
        }
      ]
    },
    {
      id: "window-cleaning",
      title: "Umytí oken",
      icon: "Sun",
      fields: [
        {
          id: "windowCleaning",
          type: "radio",
          label: "Chci také v prostorech umýt okna",
          required: true,
          layout: "vertical",
          options: [
            { value: "yes", label: "Ano" },
            { value: "no", label: "Ne" }
          ]
        },
        {
          id: "window-cleaning-area",
          type: "conditional",
          label: "",
          required: false,
          condition: { field: "windowCleaning", value: "yes" },
          fields: [
            {
              id: "windowCleaningArea",
              type: "radio",
              label: "Orientační plocha oken určených k umytí",
              required: true,
              layout: "vertical",
              options: [
                { value: "up-to-30", label: "Do 30 m² (celkový čas úklidu min. 4 hod. práce)", coefficient: 4.0},
                { value: "up-to-50", label: "Do 50 m² (celkový čas úklidu min. 4 hod. práce)", coefficient: 4.0},
                { value: "50-75", label: "Od 50 do 75 m² (celkový čas úklidu min. 5 hod. práce)", coefficient: 5.0},
                { value: "75-100", label: "Od 75 do 100 m² (celkový čas úklidu min. 5 hod. práce)", coefficient: 5.0},
                { value: "100-125", label: "Od 100 do 125 m² (celkový čas úklidu min. 6 hod. práce)", coefficient: 6.0},
                { value: "125-200", label: "Od 125 do 200 m² (celkový čas úklidu min. 6 hod. práce)", coefficient: 6.0},
                { value: "200-plus", label: "Od 200 a více m² (celkový čas úklidu min. 6 hod. práce)", coefficient: 6.0}
              ]
            }
          ]
        }
      ]
    },
    {
      id: "cleaning-supplies",
      title: "Úklidové náčiní a úklidová chemie",
      note: "Včetně spotřebního zboží (hadry, utěrky, atd.)",
      icon: "Droplets",
      fields: [
        {
          id: "cleaningSupplies",
          type: "checkbox",
          label: "",
          required: true,
          layout: "vertical",
          options: [
            { value: "worker-brings", label: "Přiveze pracovník úklidu", fixedAddon: 400, note: "recommended" },
            { value: "own-vacuum", label: "K úklidu je potřeba vlastní vysavač", fixedAddon: 250 },
            { value: "own-ladders", label: "K úklidu jsou potřeba štafle nebo schůdky", fixedAddon: 250 },
            { 
              value: "own-supplies", 
              label: "Mám vlastní odpovídající úklidové náčiní a úklidovou chemii", 
              fixedAddon: 0
            }
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
      id: "optional-services",
      title: "Příplatkové služby",
      icon: "Plus",
      optional: true,
      fields: [
        {
          id: "optionalServices",
          type: "checkbox",
          label: "",
          required: false,
          options: [
            { value: "english-speaking", label: "Požadavek anglicky mluvícího pracovníka", coefficient: 1.4 }
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
