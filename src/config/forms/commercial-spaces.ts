import { z } from "zod";
import { FormConfig } from "@/types/form-types";

// Base prices and inflation
const BASE_PRICES = {
  regularCleaning: 2450, // Base price per month for regular commercial spaces cleaning
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
const commercialSpacesSchema = z.object({
  cleaningFrequency: z.string().min(1, "Vyberte četnost úklidu nebytových prostor"),
  calculationMethod: z.string().min(1, "Vyberte způsob výpočtu"),
  hoursPerCleaning: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (typeof val === 'string') return parseFloat(val) || undefined;
    return val;
  }),
  spaceArea: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (typeof val === 'string') return parseFloat(val) || undefined;
    return val;
  }),
  floorType: z.string().min(1, "Vyberte převládající typ podlahové krytiny"),
  generalCleaning: z.string().min(1, "Vyberte, zda požadujete generální úklid"),
  dishwashing: z.string().min(1, "Vyberte požadavek na pravidelné mytí nádobí"),
  afterHours: z.string().min(1, "Vyberte, zda úklid probíhá mimo pracovní dobu"),
  location: z.string().min(1, "Vyberte lokalitu"),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  // Validate calculation method specific fields
  if (data.calculationMethod === "hourly") {
    if (!data.hoursPerCleaning || (typeof data.hoursPerCleaning === 'number' && data.hoursPerCleaning <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Zadejte požadovaný počet hodin na úklid",
        path: ["hoursPerCleaning"]
      });
    }
  } else if (data.calculationMethod === "area") {
    if (!data.spaceArea || (typeof data.spaceArea === 'number' && data.spaceArea <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Zadejte plochu nebytových prostor",
        path: ["spaceArea"]
      });
    }
  }
});

export const commercialSpacesFormConfig: FormConfig = {
  id: "commercial-spaces",
  title: "Pravidelný úklid komerčních nebytových prostorů",
  description: `Vyplňte údaje pro výpočet ceny úklidových služeb pro komerční nebytové prostory (prodejny, sklady, fitness, kadeřnictví, ordinace, školky, restaurace, bary, kavárny…). Všechny údaje označené jsou povinné. Ceny jsou aktualizovány s inflací ${(INFLATION_RATE * 100).toFixed(1)}% od roku ${INFLATION_START_YEAR}.`,
  validationSchema: commercialSpacesSchema,
  basePrice: CURRENT_PRICES.regularCleaning,
  conditions: [
    "Dostupnost alespoň studené vody v nebytových prostorech",
    "Uzamykatelná místnost nebo uzamykatelná část prostor na úklidové náčiní a úklidovou chemii"
  ],
  sections: [
    {
      id: "cleaning-frequency",
      title: "Četnost úklidu nebytových prostor",
      icon: "Calendar",
      fields: [
        {
          id: "cleaningFrequency",
          type: "radio",
          label: "",
          required: true,
          layout: "vertical",
          options: [
            { value: "workdays", label: "každý pracovní den", coefficient: 3.67 },
            { value: "everyday", label: "každý den včetně víkendů", coefficient: 4.0 },
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
              id: "spaceArea",
              type: "input",
              label: "Orientáční plocha nebytových prostor (m²):",
              required: true,
              inputType: "number",
              min: 1,
              step: 1,
              placeholder: "např. 150",
              description: "Zadejte plochu nebytových prostor v m²"
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
            { value: "carpet-combined", label: "Kombinace koberců a hladké podlahy", coefficient: 1.02 },
            { value: "carpet", label: "Koberce", coefficient: 1.06 }
          ]
        }
      ]
    },
    {
      id: "general-cleaning",
      title: "Požadavek generálního úklidu nebytových prostor",
      icon: "Sparkles",
      fields: [
        {
          id: "generalCleaning",
          type: "radio",
          label: "Generální úklid se provádí 2x ročně (mytí osvětlení, odstranění pavučin)",
          required: true,
          layout: "horizontal",
          options: [
            { value: "yes", label: "Ano", coefficient: 1.03 },
            { value: "no", label: "Ne", coefficient: 0.96 }
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
          label: "Pravidelné mytí nádobí v kuchyňce (pokud je)",
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
      id: "after-hours",
      title: "Úklid mimo pracovní dobu",
      icon: "Clock",
      fields: [
        {
          id: "afterHours",
          type: "radio",
          label: "Úklidové práce budou probíhat mimo pracovní dobu v nebytových prostorech (brzo ráno před 8:00 hod nebo večer po 17:00 hod a pracovník úklidu bude mít od prostor klíče nebo čipy)",
          required: true,
          layout: "vertical",
          options: [
            { value: "yes", label: "Ano", coefficient: 1.0 },
            { value: "no", label: "Ne, je potřeba provádět úklid v pracovní době", coefficient: 1.05 }
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
