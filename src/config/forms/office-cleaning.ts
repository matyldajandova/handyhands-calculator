import { z } from "zod";
import { FormConfig } from "@/types/form-types";

// Base prices and inflation
const BASE_PRICES = {
  regularCleaning: 2450, // Base price per month for regular office cleaning
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
const officeCleaningSchema = z.object({
  cleaningFrequency: z.string().min(1, "Vyberte četnost úklidu kanceláří"),
  calculationMethod: z.string().min(1, "Vyberte způsob výpočtu"),
  hoursPerCleaning: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (typeof val === 'string') return parseFloat(val) || undefined;
    return val;
  }),
  officeArea: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (typeof val === 'string') return parseFloat(val) || undefined;
    return val;
  }),
  floorType: z.string().min(1, "Vyberte převládající typ podlahové krytiny"),
  generalCleaning: z.string().min(1, "Vyberte, zda požadujete generální úklid"),
  generalCleaningWindows: z.string().optional(),
  windowAreaBoth: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (typeof val === 'string') return parseFloat(val) || undefined;
    return val;
  }),
  windowCountBoth: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (typeof val === 'string') return parseInt(val) || undefined;
    return val;
  }),
  windowAreaInside: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (typeof val === 'string') return parseFloat(val) || undefined;
    return val;
  }),
  windowCountInside: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (typeof val === 'string') return parseInt(val) || undefined;
    return val;
  }),
  dishwashing: z.string().min(1, "Vyberte požadavek na pravidelné mytí nádobí"),
  toiletCleaning: z.string().min(1, "Vyberte, zda je součástí úklidu i úklid WC"),
  afterHours: z.string().min(1, "Vyberte, zda úklid probíhá mimo pracovní dobu"),
  location: z.string().min(1, "Vyberte lokalitu"),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  // Validate calculation method specific fields
  if (data.calculationMethod === "hourly") {
    if (!data.hoursPerCleaning || data.hoursPerCleaning <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Zadejte požadovaný počet hodin na úklid",
        path: ["hoursPerCleaning"]
      });
    }
  } else if (data.calculationMethod === "area") {
    if (!data.officeArea || data.officeArea <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Zadejte plochu kanceláře",
        path: ["officeArea"]
      });
    }
  }

  // Validate general cleaning details when general cleaning is "yes"
  if (data.generalCleaning === "yes") {
    if (!data.generalCleaningWindows) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vyberte typ generálního úklidu oken",
        path: ["generalCleaningWindows"]
      });
    }
    if (data.generalCleaningWindows === "both-sides") {
      if (!data.windowAreaBoth || data.windowAreaBoth <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Zadejte plochu oken v m² (oboustranně)",
          path: ["windowAreaBoth"]
        });
      }
      if (!data.windowCountBoth || data.windowCountBoth <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Zadejte počet oken (oboustranně)",
          path: ["windowCountBoth"]
        });
      }
    } else if (data.generalCleaningWindows === "inside-only") {
      if (!data.windowAreaInside || data.windowAreaInside <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Zadejte plochu oken v m² (jednostranně)",
          path: ["windowAreaInside"]
        });
      }
      if (!data.windowCountInside || data.windowCountInside <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Zadejte počet oken (jednostranně)",
          path: ["windowCountInside"]
        });
      }
    }
  }
});

export const officeCleaningFormConfig: FormConfig = {
  id: "office-cleaning",
  title: "Pravidelný úklid kanceláří",
  description: `Vyplňte údaje pro výpočet ceny úklidových služeb pro kanceláře. Všechny údaje označené jsou povinné. Ceny jsou aktualizovány s inflací ${(INFLATION_RATE * 100).toFixed(1)}% od roku ${INFLATION_START_YEAR}.`,
  validationSchema: officeCleaningSchema,
  basePrice: CURRENT_PRICES.regularCleaning,
  conditions: [],
  sections: [
    {
      id: "cleaning-frequency",
      title: "Četnost úklidu kanceláří",
      icon: "Calendar",
      fields: [
        {
          id: "cleaningFrequency",
          type: "radio",
          label: "",
          required: true,
          layout: "vertical",
          options: [
            { value: "daily", label: "každý den", coefficient: 3.67 },
            { value: "3x-weekly", label: "3x týdně", coefficient: 2.0 },
            { value: "2x-weekly", label: "2x týdně", coefficient: 1.67 },
            { value: "weekly", label: "1x týdně", coefficient: 1.0 },
            { value: "biweekly", label: "1x za 14 dní", coefficient: 0.75 },
            { value: "daily-basic-weekly", label: "každý den pouze vynášení košů + úklid WC a úklid podlah a povrchů 1x týdně", coefficient: 2.5 },
            { value: "daily-basic-weekly-wc", label: "každý den pouze vynášení košů a úklid podlah a povrchů včetně WC 1x týdně", coefficient: 2.0 }
          ]
        }
      ]
    },
    {
      id: "calculation-method",
      title: "Způsob výpočtu",
      icon: "Calculator",
      fields: [
        {
          id: "calculationMethod",
          type: "radio",
          label: "",
          required: true,
          layout: "horizontal",
          options: [
            { value: "hourly", label: "Varianta A - hodinová" },
            { value: "area", label: "Varianta B - plošná" }
          ]
        },
        {
          id: "hourly-calculation",
          type: "conditional",
          label: "Hodinový výpočet",
          required: false,
          condition: { field: "calculationMethod", value: "hourly" },
          fields: [
            {
              id: "hoursPerCleaning",
              type: "input",
              label: "Požadujeme, aby každý úklid trval (hod/úklid):",
              required: true,
              inputType: "number",
              min: 0.5,
              step: 0.5,
              placeholder: "např. 1.5",
              description: "Zadejte počet hodin na úklid"
            }
          ]
        },
        {
          id: "area-calculation",
          type: "conditional",
          label: "Plošný výpočet",
          required: false,
          condition: { field: "calculationMethod", value: "area" },
          fields: [
            {
              id: "officeArea",
              type: "input",
              label: "Orientáční plocha kanceláře (m²):",
              required: true,
              inputType: "number",
              min: 1,
              step: 1,
              placeholder: "např. 150",
              description: "Zadejte plochu kanceláře v m²"
            }
          ]
        }
      ]
    },
    {
      id: "floor-type",
      title: "Převládající typ podlahové krytiny",
      icon: "Square",
      fields: [
        {
          id: "floorType",
          type: "radio",
          label: "",
          required: true,
          layout: "vertical",
          options: [
            { value: "pvc", label: "PVC", coefficient: 0.96 },
            { value: "stone", label: "Kámen", coefficient: 0.96 },
            { value: "floating", label: "Plovoucí podlaha", coefficient: 0.96 },
            { value: "ceramic", label: "Keramika", coefficient: 0.93 },
            { value: "carpet", label: "Koberce", coefficient: 1.06 }
          ]
        }
      ]
    },
    {
      id: "general-cleaning",
      title: "Požadavek generálního úklidu kanceláře",
      icon: "Sparkles",
      fields: [
        {
          id: "generalCleaning",
          type: "radio",
          label: "Generální úklid se provádí 2x ročně (mytí osvětlení, dezinfekce kuchyňských spotřebičů)",
          required: true,
          layout: "horizontal",
          options: [
            { value: "yes", label: "Ano", coefficient: 1.04 },
            { value: "no", label: "Ne", coefficient: 0.98 }
          ]
        },
        {
          id: "general-cleaning-windows",
          type: "conditional",
          label: "Generální úklid včetně mytí oken v kancelářích",
          required: false,
          condition: { field: "generalCleaning", value: "yes" },
          fields: [
            {
              id: "generalCleaningWindows",
              type: "radio",
              label: "Typ mytí oken",
              required: true,
              layout: "vertical",
              options: [
                { value: "both-sides", label: "Oboustranně" },
                { value: "inside-only", label: "Jednostranně (jen zevnitř)" }
              ]
            }
          ]
        },
        {
          id: "window-area-both",
          type: "conditional",
          label: "Plocha oken (oboustranně)",
          required: false,
          condition: { field: "generalCleaningWindows", value: "both-sides" },
          fields: [
            {
              id: "windowAreaBoth",
              type: "input",
              label: "Plocha oken v m²:",
              required: true,
              inputType: "number",
              min: 0.1,
              step: 0.1,
              placeholder: "např. 25.5",
              description: "Zadejte plochu oken v m²"
            }
          ]
        },
        {
          id: "window-count-both",
          type: "conditional",
          label: "Počet oken (oboustranně)",
          required: false,
          condition: { field: "generalCleaningWindows", value: "both-sides" },
          fields: [
            {
              id: "windowCountBoth",
              type: "input",
              label: "Počet oken celkově:",
              required: true,
              inputType: "number",
              min: 1,
              step: 1,
              placeholder: "např. 8",
              description: "Zadejte celkový počet oken"
            }
          ]
        },
        {
          id: "window-area-inside",
          type: "conditional",
          label: "Plocha oken (jednostranně)",
          required: false,
          condition: { field: "generalCleaningWindows", value: "inside-only" },
          fields: [
            {
              id: "windowAreaInside",
              type: "input",
              label: "Plocha oken v m²:",
              required: true,
              inputType: "number",
              min: 0.1,
              step: 0.1,
              placeholder: "např. 25.5",
              description: "Zadejte plochu oken v m²"
            }
          ]
        },
        {
          id: "window-count-inside",
          type: "conditional",
          label: "Počet oken (jednostranně)",
          required: false,
          condition: { field: "generalCleaningWindows", value: "inside-only" },
          fields: [
            {
              id: "windowCountInside",
              type: "input",
              label: "Počet oken celkově:",
              required: true,
              inputType: "number",
              min: 1,
              step: 1,
              placeholder: "např. 8",
              description: "Zadejte celkový počet oken"
            }
          ]
        }
      ]
    },
    {
      id: "dishwashing",
      title: "Požadavek na pravidelné mytí nádobí v kuchyňce",
      icon: "Droplets",
      fields: [
        {
          id: "dishwashing",
          type: "radio",
          label: "",
          required: true,
          layout: "vertical",
          options: [
            { value: "yes", label: "Ano", coefficient: 1.02 },
            { value: "no", label: "Ne", coefficient: 0.97 },
            { value: "dishwasher-only", label: "Ano, ale pouze vložení nádobí do myčky", coefficient: 1.01 }
          ]
        }
      ]
    },
    {
      id: "toilet-cleaning",
      title: "Úklid WC",
      icon: "Bath",
      fields: [
        {
          id: "toiletCleaning",
          type: "radio",
          label: "Součástí úklidu kanceláří je i úklid WC",
          required: true,
          layout: "horizontal",
          options: [
            { value: "yes", label: "Ano", coefficient: 1.05 },
            { value: "no", label: "Ne", coefficient: 0.96 }
          ]
        }
      ]
    },
    {
      id: "after-hours",
      title: "Úklid mimo pracovní dobu",
      icon: "Clock",
      fields: [
        {
          id: "afterHours",
          type: "radio",
          label: "Úklidové práce budou probíhat mimo pracovní dobu v kancelářích (brzo ráno před 8:00 hod nebo večer po 17:00 hod)",
          required: true,
          layout: "vertical",
          options: [
            { value: "yes", label: "Ano, pracovníkovi úklidu bude umožněn přístup do prostor kanceláří (bude mít klíče nebo čipy)", coefficient: 1.0 },
            { value: "no", label: "Ne, je potřeba provádět úklid v pracovní době kanceláří (pracovník úklidu nebude mít klíče nebo čipy od prostor)", coefficient: 1.05 }
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
