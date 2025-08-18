import { z } from "zod";
import { FormConfig } from "@/types/form-types";

// Base prices and inflation
const BASE_PRICES = {
  regularCleaning: 4500, // Base price per month for regular panel building cleaning
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
const panelBuildingSchema = z.object({
  cleaningFrequency: z.string().min(1, "Vyberte četnost úklidu panelového domu"),
  aboveGroundFloors: z.union([z.string(), z.number()]).transform((val: string | number) => {
    if (typeof val === 'string') {
      const num = parseInt(val, 10);
      return isNaN(num) ? 1 : num;
    }
    return val;
  }).refine((val) => val >= 1, { message: "Vyberte počet nadzemních pater" }),
  basementCleaning: z.string().min(1, "Vyberte, zda požadujete úklid suterénu"),
  entranceCount: z.union([z.string(), z.number()]).transform((val: string | number) => {
    if (typeof val === 'string') {
      const num = parseInt(val, 10);
      return isNaN(num) ? 1 : num;
    }
    return val;
  }).refine((val) => val >= 1, { message: "Vyberte počet jednotlivých vchodů" }),
  apartmentsPerFloor: z.string().min(1, "Vyberte orientační počet bytů na patře"),
  hasElevator: z.string().min(1, "Vyberte, zda má dům výtah"),
  generalCleaning: z.string().min(1, "Vyberte, zda požadujete generální úklid domu"),
  windowsPerFloor: z.union([z.string(), z.number()]).optional().transform((val: string | number | undefined) => {
    if (val === undefined) return undefined;
    if (typeof val === 'string') {
      const num = parseInt(val, 10);
      return isNaN(num) ? undefined : num;
    }
    return val;
  }),
  winterMaintenance: z.string().min(1, "Vyberte, zda máte zájem o zimní údržbu"),
  communicationArea: z.union([z.string(), z.number()]).optional().transform((val: string | number | undefined) => {
    if (val === undefined) return undefined;
    if (typeof val === 'number') return val;
    const trimmed = val.trim();
    if (trimmed === '') return undefined;
    const num = parseFloat(trimmed);
    return isNaN(num) ? undefined : num;
  }),
  location: z.string().min(1, "Vyberte lokalitu"),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  // Validate general cleaning details when general cleaning is "yes"
  if (data.generalCleaning === "yes") {
    if (!data.windowsPerFloor || data.windowsPerFloor <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Zadejte počet oken na patře",
        path: ["windowsPerFloor"]
      });
    }
  }
  
  // Validate communication area when winter maintenance is "yes"
  if (data.winterMaintenance === "yes") {
    if (data.communicationArea === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Zadejte plochu komunikací",
        path: ["communicationArea"]
      });
    } else if (typeof data.communicationArea === 'number' && data.communicationArea <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Plocha komunikací musí být větší než 0",
        path: ["communicationArea"]
      });
    }
  }
});

export const panelBuildingFormConfig: FormConfig = {
  id: "panel-building",
  title: "Pravidelný úklid panelových domů",
  description: `Vyplňte údaje pro výpočet ceny úklidových služeb pro panelové domy. Všechny údaje jsou povinné. Ceny jsou aktualizovány s inflací ${(INFLATION_RATE * 100).toFixed(1)}% od roku ${INFLATION_START_YEAR}.`,
  validationSchema: panelBuildingSchema,
  basePrice: CURRENT_PRICES.regularCleaning,
  conditions: [
    "V ceně je obsažen i pravidelný generální úklid 2x ročně",
    "Dostupnost alespoň studené vody v domě",
    "Uzamykatelná místnost nebo místo na úklidové náčiní a úklidovou chemii"
  ],
  sections: [
    {
      id: "cleaning-frequency",
      title: "Četnost úklidu panelového domu",
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
            { value: "mixed-weekly", label: "1x týdně nadzemní patra a 2x týdně přízemí", coefficient: 1.45 },
            { value: "seasonal", label: "1x týdně v letním období a 2x týdně v zimním období", coefficient: 1.35, note: "recommended" }
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
          label: "Počet nadzemních pater v panelovém domě",
          required: true,
          layout: "vertical",
          options: [
            { value: 3, label: "3", coefficient: 0.76 },
            { value: 4, label: "4", coefficient: 0.82 },
            { value: 5, label: "5", coefficient: 0.9 },
            { value: 6, label: "6", coefficient: 0.96 },
            { value: 7, label: "7", coefficient: 1.0 },
            { value: 8, label: "8", coefficient: 1.1 },
            { value: 9, label: "9", coefficient: 1.31 },
            { value: 10, label: "10", coefficient: 1.45 },
            { value: 11, label: "11", coefficient: 1.63 },
            { value: 12, label: "12", coefficient: 1.66 },
            { value: "13+", label: "13 a více pater", coefficient: 1.75 }
          ]
        },
        {
          id: "basementCleaning",
          type: "radio",
          label: "Úklid suterénu (pokud má dům suterén) 1x měsíčně v panelovém domě",
          required: true,
          layout: "horizontal",
          options: [
            { value: "yes", label: "Ano", coefficient: 1.1 },
            { value: "no", label: "Ne", coefficient: 0.97 }
          ]
        },
        {
          id: "entranceCount",
          type: "radio",
          label: "Počet jednotlivých vchodů (schodišť) v panelovém domě",
          required: true,
          layout: "vertical",
          options: [
            { value: 1, label: "1", coefficient: 0.4 },
            { value: 2, label: "2", coefficient: 0.67 },
            { value: 3, label: "3", coefficient: 1.0 },
            { value: 4, label: "4", coefficient: 1.235 },
            { value: 5, label: "5", coefficient: 1.472 },
            { value: 6, label: "6", coefficient: 1.59 },
            { value: 7, label: "7", coefficient: 1.69 }
          ]
        },
        {
          id: "apartmentsPerFloor",
          type: "radio",
          label: "Orientační počet bytů na patře",
          required: true,
          layout: "vertical",
          options: [
            { value: "1", label: "1", coefficient: 0.85 },
            { value: "2", label: "2", coefficient: 0.97 },
            { value: "3", label: "3", coefficient: 1.0 },
            { value: "4", label: "4", coefficient: 1.03 },
            { value: "5", label: "5", coefficient: 1.2 },
            { value: "6+", label: "6 a více", coefficient: 1.5 }
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
            { value: "yes", label: "Ano", coefficient: 1.0 },
            { value: "no", label: "Ne", coefficient: 1.05 }
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
          label: "Generální úklid domu 2x ročně",
          required: true,
          layout: "horizontal",
          options: [
            { value: "yes", label: "Ano", coefficient: 1.0 },
            { value: "no", label: "Ne", coefficient: 0.97 }
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
              id: "windowsPerFloor",
              type: "radio",
              label: "Počet oken na patře",
              required: true,
              layout: "vertical",
              options: [
                { value: 1, label: "1", coefficient: 0.98 },
                { value: 2, label: "2", coefficient: 1.0 },
                { value: 3, label: "3", coefficient: 1.05 },
                { value: 4, label: "4", coefficient: 1.015 },
                { value: "5-10", label: "5-10", coefficient: 1.05 }
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
          label: "Mám zájem i o zimní údržbu kolem domu",
          required: true,
          layout: "horizontal",
          options: [
            { value: "yes", label: "Ano" },
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
