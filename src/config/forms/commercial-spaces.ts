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
  hoursPerCleaning: z.string().optional(),
  spaceAreaNonDaily: z.string().optional(),
  spaceAreaDaily: z.string().optional(),
  floorType: z.string().min(1, "Vyberte převládající typ podlahové krytiny"),
  generalCleaning: z.string().min(1, "Vyberte, zda požadujete generální úklid"),
  generalCleaningWindows: z.string().optional(),
  windowAreaBoth: z.preprocess((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    if (typeof val === 'string') {
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    }
    return val;
  }, z.union([z.number().min(0.1), z.undefined()])).optional(),
  windowAreaInside: z.preprocess((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    if (typeof val === 'string') {
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    }
    return val;
  }, z.union([z.number().min(0.1), z.undefined()])).optional(),
  dishwashing: z.string().min(1, "Vyberte požadavek na pravidelné mytí nádobí"),
  afterHours: z.string().min(1, "Vyberte, zda úklid probíhá mimo pracovní dobu"),
  preferredTimeType: z.string().optional(),
  preferredHourMorning: z.string().optional(),
  preferredHourEvening: z.string().optional(),
  cleaningChemicals: z.string().min(1, "Vyberte způsob dodávání úklidové chemie"),
  cleaningTools: z.string().min(1, "Vyberte způsob dodávání úklidového náčiní"),
  cleaningDays: z.array(z.string()).optional(),
  zipCode: z.string().min(1, "Zadejte PSČ").regex(/^\d{5}$/, "PSČ musí mít přesně 5 čísel"),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  // Validate calculation method specific fields
  if (data.calculationMethod === "hourly") {
    if (!data.hoursPerCleaning || data.hoursPerCleaning === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vyberte požadovanou délku úklidu",
        path: ["hoursPerCleaning"]
      });
    }
  } else if (data.calculationMethod === "area") {
    // Check if daily cleaning is selected
    const dailyFrequencies = ["workdays", "everyday", "daily-basic-weekly", "daily-basic-weekly-wc", "daily-weekends-basic-weekly", "daily-weekends-basic-weekly-wc"];
    if (dailyFrequencies.includes(data.cleaningFrequency)) {
      if (!data.spaceAreaDaily || data.spaceAreaDaily === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Vyberte orientační plochu nebytových prostor",
          path: ["spaceAreaDaily"]
        });
      }
    } else {
      // For non-daily cleaning frequencies
      if (!data.spaceAreaNonDaily || data.spaceAreaNonDaily === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Vyberte orientační plochu nebytových prostor",
          path: ["spaceAreaNonDaily"]
        });
      }
    }
  }

  // Validate cleaning days selection based on frequency
  const frequencyRequiresDays = ["3x-weekly", "2x-weekly", "weekly", "biweekly"];
  if (frequencyRequiresDays.includes(data.cleaningFrequency)) {
    if (!data.cleaningDays || data.cleaningDays.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vyberte preferované dny v týdnu pro úklid",
        path: ["cleaningDays"]
      });
    } else if (data.cleaningDays.includes("no-preference")) {
      // If "no preference" is selected, it's valid regardless of other selections
      // No additional validation needed
    } else {
      // Validate that the correct number of days is selected
      const expectedDays = {
        "3x-weekly": 3,
        "2x-weekly": 2,
        "weekly": 1,
        "biweekly": 1
      };
      
      const expectedCount = expectedDays[data.cleaningFrequency as keyof typeof expectedDays];
      if (data.cleaningDays.length !== expectedCount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Musíte vybrat přesně ${expectedCount} ${expectedCount === 1 ? 'den' : expectedCount < 5 ? 'dny' : 'dní'} v týdnu`,
          path: ["cleaningDays"]
        });
      }
    }
  }

  // Validate preferred time details when after hours is "yes"
  if (data.afterHours === "yes") {
    if (!data.preferredTimeType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vyberte preferovaný čas úklidu",
        path: ["preferredTimeType"]
      });
    }
    if (data.preferredTimeType === "morning" && !data.preferredHourMorning) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vyberte čas",
        path: ["preferredHourMorning"]
      });
    }
    if (data.preferredTimeType === "evening" && !data.preferredHourEvening) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vyberte čas",
        path: ["preferredHourEvening"]
      });
    }
  }

  // Validate window area fields when general cleaning windows is selected
  if (data.generalCleaning === "yes") {
    if (!data.generalCleaningWindows || data.generalCleaningWindows === "") {
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
    } else if (data.generalCleaningWindows === "inside-only") {
      if (!data.windowAreaInside || data.windowAreaInside <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Zadejte plochu oken v m² (jednostranně)",
          path: ["windowAreaInside"]
        });
      }
    }
  }
});

export const commercialSpacesFormConfig: FormConfig = {
  id: "commercial-spaces",
  title: "Pravidelný úklid komerčních nebytových prostorů",
  description: `Vyplňte údaje pro výpočet ceny úklidových služeb pro komerční nebytové prostory (prodejny, sklady, fitness, kadeřnictví, ordinace, školky, restaurace, bary, kavárny…). Všechny údaje jsou povinné.`,
  validationSchema: commercialSpacesSchema,
  basePrice: CURRENT_PRICES.regularCleaning,
  conditions: [],
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
            { value: "workdays", label: "Každý pracovní den", coefficient: 3.67 },
            { value: "everyday", label: "Každý den včetně víkendů", coefficient: 4.0 },
            { value: "3x-weekly", label: "3x týdně", coefficient: 2.0 },
            { value: "2x-weekly", label: "2x týdně", coefficient: 1.67 },
            { value: "weekly", label: "1x týdně", coefficient: 1.0 },
            { value: "biweekly", label: "1x za 14 dní", coefficient: 0.75 },
            { value: "daily-basic-weekly", label: "Každý pracovní den pouze vynášení košů + úklid WC a úklid podlah a povrchů 1x týdně", tooltip: "Každý pracovní den se provádní pouze vynášení košů a uklízí se WC. Úklid podlah a porvrchů se provádí jen 1x týdne.", coefficient: 2.4, hidden: true },
            { value: "daily-basic-weekly-wc", label: "Každý pracovní den pouze vynášení košů a úklid podlah a povrchů včetně WC 1x týdně", tooltip: "Každý pracovní den se provádní pouze vynášení košů. Úklid WC, podlah a porvrchů se provádí jen 1x týdne.", coefficient: 1.9, hidden: true },
            { value: "daily-weekends-basic-weekly", label: "Každý den (včetně víkendů) pouze vynášení košů + úklid WC a úklid podlah a povrchů 1x týdně", coefficient: 2.5, hidden: true },
            { value: "daily-weekends-basic-weekly-wc", label: "Každý den (včetně víkendů) pouze vynášení košů a úklid podlah a povrchů včetně WC 1x týdně", coefficient: 2, hidden: true }
          ]
        },
        {
          id: "cleaningDays",
          type: "checkbox",
          label: "Vyberte preferované dny v týdnu pro úklid",
          required: true,
          condition: {
            operator: "or",
            conditions: [
              { field: "cleaningFrequency", value: "3x-weekly", operator: "equals" },
              { field: "cleaningFrequency", value: "2x-weekly", operator: "equals" },
              { field: "cleaningFrequency", value: "weekly", operator: "equals" },
              { field: "cleaningFrequency", value: "biweekly", operator: "equals" }
            ]
          },
          options: [
            { value: "no-preference", label: "Bez preferencí" },
            { value: "monday", label: "Pondělí" },
            { value: "tuesday", label: "Úterý" },
            { value: "wednesday", label: "Středa" },
            { value: "thursday", label: "Čtvrtek" },
            { value: "friday", label: "Pátek" },
            { value: "saturday", label: "Sobota" },
            { value: "sunday", label: "Neděle" }
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
            { value: "hourly", label: "Varianta hodinová" },
            { value: "area", label: "Varianta plošná" }
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
              type: "radio",
              label: "Požadujeme, aby každý úklid trval",
              required: true,
              layout: "vertical",
              options: [
                { value: "0.5", label: "0,5 hod.", coefficient: 0.85 },
                { value: "1", label: "1 hod.", coefficient: 1.0 },
                { value: "1.5", label: "1,5 hod.", coefficient: 1.1 },
                { value: "2", label: "2 hod.", coefficient: 1.3 },
                { value: "2-3", label: "2–3 hod.", coefficient: 1.45 },
                { value: "3", label: "3 hod.", coefficient: 1.6 },
                { value: "3+", label: "Více jak 3 hod.", coefficient: 1.9 }
              ]
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
              id: "spaceAreaNonDaily",
              type: "radio",
              label: "Orientáční plocha nebytových prostor",
              required: true,
              layout: "vertical",
              condition: { 
                operator: "or",
                conditions: [
                  { field: "cleaningFrequency", value: "3x-weekly", operator: "equals" },
                  { field: "cleaningFrequency", value: "2x-weekly", operator: "equals" },
                  { field: "cleaningFrequency", value: "weekly", operator: "equals" },
                  { field: "cleaningFrequency", value: "biweekly", operator: "equals" }
                ]
              },
              options: [
                { value: "up-to-50", label: "Do 50 m²", coefficient: 0.73 },
                { value: "50-75", label: "Od 50 do 75 m²", coefficient: 0.91 },
                { value: "75-100", label: "Od 75 do 100 m²", coefficient: 1.0 },
                { value: "100-125", label: "Od 100 do 125 m²", coefficient: 1.1 },
                { value: "125-200", label: "Od 125 do 200 m²", coefficient: 1.3 },
                { value: "200-300", label: "Od 200 do 300 m²", coefficient: 1.6 },
                { value: "300-500", label: "Od 300 do 500 m²", coefficient: 1.9 },
                { value: "500-700", label: "Od 500 do 700 m²", coefficient: 2.07 },
                { value: "700-plus", label: "Nad 700 m²", coefficient: 2.67 }
              ]
            },
            {
              id: "spaceAreaDaily",
              type: "radio",
              label: "Orientáční plocha nebytových prostor",
              required: true,
              layout: "vertical",
              condition: { 
                operator: "or",
                conditions: [
                  { field: "cleaningFrequency", value: "workdays", operator: "equals" },
                  { field: "cleaningFrequency", value: "everyday", operator: "equals" },
                  { field: "cleaningFrequency", value: "daily-basic-weekly", operator: "equals" },
                  { field: "cleaningFrequency", value: "daily-basic-weekly-wc", operator: "equals" },
                  { field: "cleaningFrequency", value: "daily-weekends-basic-weekly", operator: "equals" },
                  { field: "cleaningFrequency", value: "daily-weekends-basic-weekly-wc", operator: "equals" },
                  { field: "cleaningFrequency", value: "", operator: "equals" }
                ]
              },
              options: [
                { value: "up-to-50", label: "Do 50 m²", coefficient: 0.42 },
                { value: "50-75", label: "Od 50 do 75 m²", coefficient: 0.58 },
                { value: "75-100", label: "Od 75 do 100 m²", coefficient: 0.62 },
                { value: "100-125", label: "Od 100 do 125 m²", coefficient: 0.66 },
                { value: "125-200", label: "Od 125 do 200 m²", coefficient: 0.8 },
                { value: "200-300", label: "Od 200 do 300 m²", coefficient: 0.957 },
                { value: "300-500", label: "Od 300 do 500 m²", coefficient: 1.25 },
                { value: "500-700", label: "Od 500 do 700 m²", coefficient: 1.5 },
                { value: "700-1500", label: "Od 700 do 1500 m²", coefficient: 2.4 },
                { value: "1500-2500", label: "Od 1500 do 2500 m²", coefficient: 3.35 },
                { value: "2500-plus", label: "Nad 2500 m²", coefficient: 3.7 }
              ]
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
            { value: "smooth", label: "Hladké (prach a nečistoty odstraňované mokrým způsobem, např. PVC, linoleum, keramika, plovoucí podlaha, kámen)", coefficient: 0.96 },
            { value: "carpet", label: "Koberce (prach a nečistoty odstraňované vysavačem)", tooltip: "Vysavač je v režii objednatele a jeho pořízení a správa není zahrnuta v cenové nabídce.", coefficient: 1.06 },
            { value: "combination", label: "Kombinace těchto povrchů (k údržbě je potřeba jak mop, tak vysavač)", tooltip: "Vysavač je v režii objednatele a jeho pořízení a správa není zahrnuta v cenové nabídce.", coefficient: 1.02 }
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
          label: "Generální úklid se provádí 2x ročně (mytí oken, osvětlení, dezinfekce kuchyňských spotřebičů)",
          required: true,
          layout: "horizontal",
          options: [
            { value: "yes", label: "Ano", coefficient: 1.03 },
            { value: "no", label: "Ne", coefficient: 0.96 }
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
              required: false,
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
          label: "Orientační plocha oken (oboustranně)",
          required: false,
          condition: { 
            operator: "and",
            conditions: [
              { field: "generalCleaning", value: "yes", operator: "equals" },
              { field: "generalCleaningWindows", value: "both-sides", operator: "equals" }
            ]
          },
          fields: [
            {
              id: "windowAreaBoth",
              type: "input",
              label: "Orientační plocha oken v m²:",
              required: false,
              inputType: "number",
              min: 0.1,
              max: 1000,
              step: 0.1,
              placeholder: "např. 25.5",
              description: "Zadejte plochu oken v m² (max. 1000 m²)"
            }
          ]
        },
        {
          id: "window-area-inside",
          type: "conditional",
          label: "Orientační plocha oken (jednostranně)",
          required: false,
          condition: { 
            operator: "and",
            conditions: [
              { field: "generalCleaning", value: "yes", operator: "equals" },
              { field: "generalCleaningWindows", value: "inside-only", operator: "equals" }
            ]
          },
          fields: [
            {
              id: "windowAreaInside",
              type: "input",
              label: "Orientační plocha oken v m²:",
              required: false,
              inputType: "number",
              min: 0.1,
              max: 1000,
              step: 0.1,
              placeholder: "např. 25.5",
              description: "Zadejte plochu oken v m² (max. 1000 m²)"
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
          label: "Úklidové práce budou probíhat mimo pracovní dobu v nebytových prostorech",
          note: "Tedy například brzo ráno před pracovní dobou do 8:00 hod nebo večer po pracovní době, například po 17:00 hod a pracovník úklidu bude mít od prostor klíče nebo čipy.",
          required: true,
          layout: "vertical",
          options: [
            { value: "no", label: "Ne, je potřeba provádět úklid v pracovní době", coefficient: 1.05 },
            { value: "yes", label: "Ano", coefficient: 1.0 }
          ]
        },
        {
          id: "preferred-time-details",
          type: "conditional",
          label: "Pokud by úklid probíhal mimo pracovní dobu, v jakém čase nejpozději ráno má být uklizeno? (vyplní se čas z nabídky) Nebo v jakém čase nejpozději večer se může začít uklízet? (vyplní se čas z nabídky)",
          required: false,
          condition: { field: "afterHours", value: "yes" },
          fields: [
            {
              id: "preferredTimeType",
              type: "radio",
              label: "Preferovaný čas úklidu:",
              required: true,
              layout: "vertical",
              options: [
                { value: "morning", label: "Nejpozději ráno má být uklizeno v" },
                { value: "evening", label: "Nejdříve se může večer začít v" }
              ]
            },
            {
              id: "preferredHourMorning",
              type: "select",
              label: "",
              required: true,
              condition: { field: "preferredTimeType", value: "morning", operator: "equals" },
              options: [
                { value: "3", label: "3:00" },
                { value: "4", label: "4:00" },
                { value: "5", label: "5:00" },
                { value: "6", label: "6:00" },
                { value: "7", label: "7:00" },
                { value: "8", label: "8:00", default: true },
                { value: "9", label: "9:00" },
                { value: "10", label: "10:00" }
              ]
            },
            {
              id: "preferredHourEvening",
              type: "select",
              label: "",
              required: true,
              condition: { field: "preferredTimeType", value: "evening", operator: "equals" },
              options: [
                { value: "16", label: "16:00" },
                { value: "17", label: "17:00", default: true },
                { value: "18", label: "18:00" },
                { value: "19", label: "19:00" },
                { value: "20", label: "20:00" },
                { value: "21", label: "21:00" },
                { value: "22", label: "22:00" },
                { value: "23", label: "23:00" }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "supplies",
      title: "Dodávání úklidových prostředků a náčiní",
      icon: "Package",
      fields: [
        {
          id: "cleaningChemicals",
          type: "radio",
          label: "Dodávání úklidové chemie",
          required: true,
          layout: "vertical",
          options: [
            { 
              value: "client", 
              label: "Zajišťuje objednatel a je v jeho režii (cenová nabídka tedy neobsahuje zajišťování tohoto zboží)", 
              coefficient: 0.98 
            },
            { 
              value: "contractor", 
              label: "Zajišťuje zhotovitel a je započítán v cenové nabídce", 
              coefficient: 1.02 
            }
          ],
          note: "Zhotovitel nedodává spotřební hygienické zboží, jako jsou například toaletní papíry, pytle do košů, tahací papírové ručníky atd."
        },
        {
          id: "cleaningTools",
          type: "radio",
          label: "Dodání úklidového náčiní a jeho správa (jako např. mopy, kýble, smetáky, hadříky, utěrky, prachovky atd.)",
          required: true,
          layout: "vertical",
          options: [
            { 
              value: "client", 
              label: "Zajišťuje objednatel a je v jeho režii (cenová nabídka tedy neobsahuje zajišťování tohoto zboží)", 
              coefficient: 0.98 
            },
            { 
              value: "contractor", 
              label: "Zajišťuje zhotovitel a je započítán v cenové nabídce", 
              coefficient: 1.02 
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
          placeholder: "Zde můžete napsat další poznámky nebo požadavky..."
        }
      ]
    }
  ]
};

// Export the calculation functions and prices for use in the calculation logic
export { BASE_PRICES, CURRENT_PRICES, getInflationAdjustedPrice, INFLATION_RATE, INFLATION_START_YEAR };
