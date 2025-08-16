import { z } from "zod";
import { FormConfig } from "@/types/form-types";

// Base prices and inflation
const BASE_PRICES = {
  regularCleaning: 1500, // Base price per month for regular cleaning
  generalCleaning: {
    standard: 2300, // 2x ročně
    annual: 2900,   // 1x ročně
    quarterly: 2050 // 4x ročně
  }
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
  generalCleaning: {
    standard: getInflationAdjustedPrice(BASE_PRICES.generalCleaning.standard, currentYear),
    annual: getInflationAdjustedPrice(BASE_PRICES.generalCleaning.annual, currentYear),
    quarterly: getInflationAdjustedPrice(BASE_PRICES.generalCleaning.quarterly, currentYear)
  }
};

// Validation schema
const residentialBuildingSchema = z.object({
  cleaningFrequency: z.string().min(1, "Vyberte četnost úklidu"),
  aboveGroundFloors: z.number().min(1, "Vyberte počet nadzemních pater"),
  undergroundFloors: z.number().min(0, "Vyberte počet podzemních pater"),
  apartmentsPerFloor: z.string().min(1, "Vyberte počet bytů na patře"),
  hasElevator: z.string().min(1, "Vyberte, zda má dům výtah"),
  hasHotWater: z.string().min(1, "Vyberte, zda má dům teplou vodu"),
  generalCleaning: z.string().min(1, "Vyberte, zda požadujete generální úklid"),
  generalCleaningType: z.string().optional(),
  windowsPerFloor: z.number().optional(),
  floorsWithWindows: z.union([z.string(), z.number()]).optional(), // Can be "all" or number
  windowType: z.string().optional(),
  basementCleaning: z.string().optional(),
  winterMaintenance: z.string().min(1, "Vyberte, zda požadujete zimní údržbu"),
  communicationArea: z.string().optional(),
  location: z.string().min(1, "Vyberte lokalitu"),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  // Validate general cleaning details when general cleaning is "yes"
  if (data.generalCleaning === "yes") {
    if (!data.generalCleaningType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vyberte typ generálního úklidu",
        path: ["generalCleaningType"]
      });
    }
    if (!data.windowsPerFloor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vyberte počet oken na patře",
        path: ["windowsPerFloor"]
      });
    }
    if (!data.floorsWithWindows) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vyberte počet pater, kde jsou okna",
        path: ["floorsWithWindows"]
      });
    }
    if (!data.windowType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vyberte typ oken",
        path: ["windowType"]
      });
    }
    if (!data.basementCleaning) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vyberte způsob úklidu suterénních pater",
        path: ["basementCleaning"]
      });
    }
  }
  
  // Validate communication area when winter maintenance is "yes"
  if (data.winterMaintenance === "yes") {
    if (!data.communicationArea || data.communicationArea.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Zadejte plochu komunikací",
        path: ["communicationArea"]
      });
    } else {
      const num = parseFloat(data.communicationArea);
      if (isNaN(num) || num <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Plocha komunikací musí být větší než 0",
          path: ["communicationArea"]
        });
      }
    }
  }
});

export const residentialBuildingFormConfig: FormConfig = {
  id: "residential-building",
  title: "Činžovní domy, novostavby",
  description: `Vyplňte údaje pro výpočet ceny úklidových služeb. Všechny údaje jsou důležité pro přesný výpočet. Ceny jsou aktualizovány s inflací ${(INFLATION_RATE * 100).toFixed(1)}% od roku ${INFLATION_START_YEAR}.`,
  validationSchema: residentialBuildingSchema,
  basePrice: CURRENT_PRICES.regularCleaning,
  conditions: [
    "Dostupnost alespoň studené vody v domě",
    "Uzamykatelná místnost nebo uzamykatelná část domu (místo) na úklidové náčiní a úklidovou chemii"
  ],
  sections: [
    {
      id: "cleaning-frequency",
      title: "Četnost úklidu domu",
      icon: "Calendar",
      fields: [
        {
          id: "cleaningFrequency",
          type: "radio",
          label: "",
          required: true,
          layout: "vertical",
          options: [
            { value: "weekly", label: "1x týdně", coefficient: 1.0, note: "frequent" },
            { value: "twice-weekly", label: "2x týdně", coefficient: 1.67 },
            { value: "biweekly", label: "1x za 14 dní", coefficient: 0.75 },
            { value: "daily", label: "každý den", coefficient: 3.67 },
            { value: "mixed-weekly", label: "1x týdně nadzemní patra a 2x týdně přízemí", coefficient: 1.45 },
            { value: "seasonal", label: "1x týdně v letním období a 2x týdně v zimním období", coefficient: 1.35, note: "recommended" },
            { value: "monthly", label: "1x za měsíc", coefficient: 0.69 }
          ]
        }
      ]
    },
    {
      id: "building-structure",
      title: "Struktura budovy",
      icon: "Building",
      fields: [
        {
          id: "aboveGroundFloors",
          type: "radio",
          label: "Počet nadzemních pater v domě včetně přízemí",
          required: true,
          layout: "vertical",
          options: [
            { value: 1, label: "1 (tedy přízemní objekt)", coefficient: 0.4 },
            { value: 2, label: "2", coefficient: 0.6 },
            { value: 3, label: "3", coefficient: 0.82 },
            { value: 4, label: "4", coefficient: 0.93 },
            { value: 5, label: "5", coefficient: 1.0 },
            { value: 6, label: "6", coefficient: 1.07 },
            { value: 7, label: "7", coefficient: 1.12 },
            { value: 8, label: "8 a více pater", coefficient: 1.17 }
          ]
        },
        {
          id: "undergroundFloors",
          type: "radio",
          label: "Počet podzemních pater v domě",
          required: true,
          layout: "vertical",
          options: [
            { value: 0, label: "Žádné", coefficient: 0.97 },
            { value: 1, label: "1", coefficient: 1.02 },
            { value: 2, label: "2", coefficient: 1.06 }
          ]
        },
        {
          id: "apartmentsPerFloor",
          type: "radio",
          label: "Orientáční počet bytů na patře",
          required: true,
          layout: "vertical",
          options: [
            { value: "less-than-3", label: "méně než 3 byty", coefficient: 0.95 },
            { value: "3", label: "3 byty", coefficient: 1.0 },
            { value: "more-than-3", label: "více jak 3 byty", coefficient: 1.11 }
          ]
        }
      ]
    },
    {
      id: "facilities",
      title: "Vybavení domu",
      icon: "ArrowUpDown",
      fields: [
        {
          id: "hasElevator",
          type: "radio",
          label: "Výtah v domě",
          required: true,
          layout: "horizontal",
          options: [
            { value: "yes", label: "Ano", coefficient: 0.97 },
            { value: "no", label: "Ne", coefficient: 1.05 }
          ]
        },
        {
          id: "hasHotWater",
          type: "radio",
          label: "Teplá voda v úklidové místnosti (nebo v domě pro potřeby úklidu)",
          required: true,
          layout: "horizontal",
          options: [
            { value: "yes", label: "Ano", coefficient: 0.99 },
            { value: "no", label: "Ne, pro potřeby úklidu pouze studená voda", coefficient: 1.03 }
          ]
        }
      ]
    },
    {
      id: "general-cleaning",
      title: "Požadavek generálního úklidu domu",
      icon: "Sparkles",
      fields: [
        {
          id: "generalCleaning",
          type: "radio",
          label: "",
          required: true,
          layout: "horizontal",
          options: [
            { value: "yes", label: "Ano" },
            { value: "no", label: "Ne", coefficient: 1.0 }
          ]
        },
        {
          id: "general-cleaning-details",
          type: "conditional",
          label: "Detaily generálního úklidu",
          required: false,
          condition: { field: "generalCleaning", value: "yes" },
          fields: [
            {
              id: "generalCleaningType",
              type: "radio",
              label: "Typ generálního úklidu",
              required: true,
              layout: "vertical",
              options: [
                { value: "annual", label: `generální úklid domu 1x ročně`, coefficient: 1.0 },
                { value: "standard", label: `standardní generální úklid domu 2x ročně`, coefficient: 1.0, note: "recommended" },
                { value: "quarterly", label: `generální úklid domu 4x ročně`, coefficient: 1.0 }
              ]
            },
            {
              id: "windowsPerFloor",
              type: "radio",
              label: "Počet oken na patře",
              required: true,
              layout: "vertical",
              options: [
                { value: 1, label: "1", coefficient: 0.9 },
                { value: 2, label: "2", coefficient: 1.0 },
                { value: 3, label: "3", coefficient: 1.02 },
                { value: 4, label: "4", coefficient: 1.1 },
                { value: 5, label: "5-10", coefficient: 1.35 }
              ]
            },
            {
              id: "floorsWithWindows",
              type: "radio",
              label: "Počet pater, kde jsou okna",
              required: true,
              layout: "vertical",
              options: [
                { value: "all", label: "ve všech nadzemních patrech", coefficient: 1.0 },
                { value: 1, label: "1", coefficient: 0.97 },
                { value: 2, label: "2", coefficient: 0.98 },
                { value: 3, label: "3", coefficient: 1.0 },
                { value: 4, label: "4", coefficient: 1.0 },
                { value: 5, label: "5", coefficient: 1.02 },
                { value: 6, label: "6", coefficient: 1.04 },
                { value: 7, label: "7", coefficient: 1.06 }
              ]
            },
            {
              id: "windowType",
              type: "radio",
              label: "Typ oken",
              required: true,
              layout: "vertical",
              options: [
                { value: "new", label: "nová plastová nebo dřevěná", coefficient: 1.0 },
                { value: "original", label: "původní dřevěná nebo hliníková", coefficient: 1.1 },
                { value: "hard-to-reach", label: "některá jsou hůře dostupná z podlahy (nutno použít např. štafle nebo teleskopické tyče)", coefficient: 1.3 }
              ]
            },
            {
              id: "basementCleaning",
              type: "radio",
              label: "Úklid suterénních pater provádět v",
              required: true,
              layout: "vertical",
              options: [
                { value: "general", label: "rámci generálního úklidu", coefficient: 1.0 },
                { value: "regular", label: "rámci pravidelného úklidu", coefficient: 1.0 }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "winter-maintenance",
      title: "Zimní údržba",
      icon: "Snowflake",
      fields: [
        {
          id: "winterMaintenance",
          type: "radio",
          label: "",
          required: true,
          layout: "horizontal",
          options: [
            { value: "yes", label: "Mám zájem i o zimní údržbu kolem domu" },
            { value: "no", label: "Ne" }
          ]
        },
        {
          id: "communication-area",
          type: "conditional",
          label: "Plocha komunikací",
          required: false,
          condition: { field: "winterMaintenance", value: "yes" },
          fields: [
            {
              id: "communicationArea",
              type: "input",
              label: "Celková plocha komunikací (v m²) nebo celková délka komunikací (v m):",
              required: true,
              inputType: "number",
              min: 0.1,
              step: 0.1,
              placeholder: "např. 150 m² nebo 50 m",
              description: "Zadejte hodnotu větší než 0"
            }
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
            { value: "prague", label: "Praha (PSČ 110 00 atd.)", coefficient: 1.0 },
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
