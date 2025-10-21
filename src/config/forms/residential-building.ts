import { z } from "zod";
import { FormConfig } from "@/types/form-types";
import { isWinterMaintenancePeriod } from "@/utils/date-utils";

// Base prices and inflation
const BASE_PRICES = {
  regularCleaning: 2400, // Base price per month for regular cleaning
  generalCleaning: {
    standard: 2300, // 2x ročně
    annual: 2900,   // 1x ročně
    quarterly: 2050 // 4x ročně
  }
};

// Fixed prices (not affected by inflation or coefficients)
const FIXED_PRICES = {
  winterService: 500, // Monthly fee for winter on-call service (Nov 15 - Mar 14) - FIXED PRICE
  winterCallout: 600  // Fee per call-out for winter maintenance - FIXED PRICE
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
  aboveGroundFloors: z.preprocess((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    if (typeof val === 'string') {
      const num = parseInt(val, 10);
      return isNaN(num) ? undefined : num;
    }
    return val;
  }, z.union([z.number().min(1), z.undefined()])).refine((val) => val !== undefined, { message: "Vyberte počet nadzemních pater" }),
  undergroundFloors: z.preprocess((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    if (typeof val === 'string') {
      const num = parseInt(val, 10);
      return isNaN(num) ? undefined : num;
    }
    return val;
  }, z.union([z.number().min(0), z.undefined()])).refine((val) => val !== undefined, { message: "Vyberte počet podzemních pater" }),
  apartmentsPerFloor: z.string().min(1, "Vyberte počet bytů na patře"),
  hasElevator: z.string().min(1, "Vyberte, zda má dům výtah"),
  hasHotWater: z.string().min(1, "Vyberte, zda má dům teplou vodu"),
  buildingPeriod: z.string().min(1, "Vyberte období výstavby domu"),
  generalCleaning: z.string().min(1, "Vyberte, zda požadujete generální úklid"),
  generalCleaningType: z.string().optional(),
  windowsPerFloor: z.preprocess((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    if (typeof val === 'string') {
      const num = parseInt(val, 10);
      return isNaN(num) ? undefined : num;
    }
    return val;
  }, z.union([z.number().min(1), z.undefined()])).optional(),
  floorsWithWindows: z.preprocess((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    if (typeof val === 'string') {
      if (val === 'all') return val;
      const num = parseInt(val, 10);
      return isNaN(num) ? undefined : num;
    }
    return val;
  }, z.union([z.number().min(1), z.literal('all'), z.undefined()])).optional(),
  windowType: z.array(z.string()).optional(),
  basementCleaning: z.string().optional(),
  basementCleaningDetails: z.string().optional(),
  winterMaintenance: z.string().min(1, "Vyberte, zda požadujete zimní údržbu"),
  spreadingMaterial: z.string().optional(),
  communicationType: z.string().optional(),
  communicationArea: z.string().optional(),
  communicationLength: z.string().optional(),
    zipCode: z.string().min(1, "Zadejte PSČ").regex(/^\d{5}$/, "PSČ musí mít přesně 5 čísel"),
  optionalServicesWeekly: z.array(z.string()).optional(),
  optionalServicesMonthly: z.array(z.string()).optional(),
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
    if (!data.windowType || data.windowType.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vyberte typ oken",
        path: ["windowType"]
      });
    } else {
      // Validate that at least one of "new" or "original" must be selected
      if (!data.windowType.includes("new") && !data.windowType.includes("original")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Musíte vybrat buď nová nebo původní okna",
          path: ["windowType"]
        });
      }
      // Validate that both "new" and "original" cannot be selected together
      if (data.windowType.includes("new") && data.windowType.includes("original")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Nelze vybrat současně nová i původní okna",
          path: ["windowType"]
        });
      }
    }
    // Only validate basement cleaning if general cleaning is yes and there are underground floors
    if (data.generalCleaning === "yes" && data.undergroundFloors && data.undergroundFloors > 0) {
      if (!data.basementCleaning) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Vyberte způsob úklidu suterénních pater",
          path: ["basementCleaning"]
        });
      }
      if (!data.basementCleaningDetails) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Vyberte rozsah úklidu suterénních prostor",
          path: ["basementCleaningDetails"]
        });
      }
    }
  }
  
  // Validate spreading material when winter maintenance is "yes"
  if (data.winterMaintenance === "yes") {
    if (!data.spreadingMaterial) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vyberte typ posypového materiálu",
        path: ["spreadingMaterial"]
      });
    }
  }
  
  // Validate communication fields when winter maintenance is "yes"
  if (data.winterMaintenance === "yes") {
    // First validate that communication type is selected
    if (!data.communicationType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vyberte, jak chcete zadat rozměry komunikací",
        path: ["communicationType"]
      });
    } else {
      // Then validate the appropriate field based on the selected type
      if (data.communicationType === "area") {
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
      } else if (data.communicationType === "length") {
        if (!data.communicationLength || data.communicationLength.trim() === "") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Zadejte délku komunikací",
            path: ["communicationLength"]
          });
        } else {
          const num = parseFloat(data.communicationLength);
          if (isNaN(num) || num <= 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Délka komunikací musí být větší než 0",
              path: ["communicationLength"]
            });
          }
        }
      }
    }
  }
});


export const residentialBuildingFormConfig: FormConfig = {
  id: "residential-building",
  title: "Pravidelný úklid činžovních domů a novostaveb",
  description: `Vyplňte údaje pro výpočet ceny úklidových služeb.`,
  validationSchema: residentialBuildingSchema,
  basePrice: CURRENT_PRICES.regularCleaning,
  conditions: [
    "Dostupnost alespoň studené vody v domě",
    "Uzamykatelná místnost nebo uzamykatelná část domu (místo) na úklidové náčiní a úklidovou chemii"
  ],
  commonServices: {
    weekly: [
      "zametání a mytí schodů, podest a chodeb ve všech patrech domu včetně přízemí",
      "otírání madel zábradlí a okenních parapetů",
      "schody do suterénu",
      "hrubý úklid dvorku",
      "oboustranné mytí skleněných vchodových dveří od otisků prstů a odstranění letáků"
    ],
    monthly: [
      "odstranění reklam",
      "vysmýčení pavučin"
    ],
    biAnnual: [
      "zametení v suterénu domu",
      "umytí všech otevíravých částí oken včetně rámů",
      "očištění osvětlení zvenčí",
      "mytí zábradlí",
      "umytí nadsvětlíků u vchodových dveří",
      "setření prachu z hydrantů, schránek, vypínačů a tech. rozvodů"
    ]
  },
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
          note: "Četnost úklidu výrazně ovlivňuje celkovou cenu. Denní úklid je nejdražší, ale poskytuje nejvyšší úroveň čistoty.",
          options: [
            { value: "weekly", label: "1x týdně", coefficient: 1.0, note: "frequent" },
            { value: "twice-weekly", label: "2x týdně", coefficient: 1.67 },
            { value: "biweekly", label: "1x za 14 dní", coefficient: 0.75 },
            { value: "daily", label: "Každý den", coefficient: 3.67 },
            { value: "mixed-weekly", label: "1x týdně nadzemní patra a 2x týdně přízemí", tooltip: "Kromě přízemí domu se myslí také úklid podlahy výtahové kabiny, pokud je v domě výtah.", coefficient: 1.45, hidden: true },
            { value: "seasonal", label: "1x týdně v letním období a 2x týdně v zimním období", coefficient: 1.35, tooltip: "Letním obdobím se rozumí období od 1. dubna do 30. září a zimním obdobím se myslí období od 1. října do 31. března.", hidden: true },
            { value: "monthly", label: "1x za měsíc", coefficient: 0.69, hidden: true }
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
          note: "",
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
          label: "Počet podzemních pater v domě určených k úklidu",
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
          label: "Orientační počet bytů na patře",
          required: true,
          layout: "vertical",
          note: "Tento údaj můžete určitě také tak, že celkový počet bytů v domě vydělíte počtem pater.",
          options: [
            { value: "less-than-3", label: "Méně než 3 byty", coefficient: 0.95 },
            { value: "3", label: "3 byty", coefficient: 1.0 },
            { value: "3-to-6", label: "Od 3 do 6 bytů", coefficient: 1.11 },
            { value: "7-or-more", label: "7 a více bytů", coefficient: 1.3 }
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
        },
        {
          id: "hasHotWater",
          type: "radio",
          label: "Teplá voda v úklidové místnosti (nebo jinde v domě pro potřeby úklidu)",
          required: true,
          layout: "horizontal",
          options: [
            { value: "yes", label: "Ano", coefficient: 0.99 },
            { value: "no", label: "Ne, pro potřeby úklidu je k dispozici pouze studená voda", coefficient: 1.03 }
          ]
        }
      ]
    },
    {
      id: "building-period",
      title: "Z jakého období je činžovní dům?",
      icon: "Building",
      fields: [
        {
          id: "buildingPeriod",
          type: "radio",
          label: "",
          required: true,
          layout: "vertical",
          options: [
            { 
              value: "pre1945", 
              label: "Dům postavený před rokem 1945", 
              coefficient: 1.0,
              tooltip: "Jedná se o klasické činžovní bytové domy s vysokými konstrukčními výškami jednotlivých pater (kolem 4 m nebo i více), mohou být v secesním nebo klasicistním stylu, stavěné do období před druhou světovou válkou. V Praze to jsou například domy postavené v částech Starého i Nového Města, Nuslích, Žižkově, Karlíně atd."
            },
            { 
              value: "post1945", 
              label: "Dům postavený po roce 1945", 
              coefficient: 0.90,
              tooltip: "Jedná se o činžovní bytové domy postavené po druhé světové válce (nebo těsně před ní), které se vyznačují menšími konstrukčními výškami jednotlivých pater (kolem 3 m) Jedná se o předchůdce dnešních panelových domů. Jsou vystavěny zejména v období funkcionalismu nebo sorely. Mají většinou ploché střechy a např. v Praze se vyskytují v částech sídliště Zelená liška, sídliště Solidarita atd."
            }
          ]
        }
      ]
    },
    {
      id: "general-cleaning",
      title: "Požadavek generálního úklidu domu",
      icon: "Sparkles",
      note: "Generálním úklidem se myslí zejména oboustranné mytí oken včetně jejich rámů a parapetů ve všech společných prostorech domu, mytí celé konstrukce zábradlí, odstranění samolepek z vchodových dveří, mytí osvětlovacích zařízení z vnější části, mytí vypínačů, poštovních schránek, hasících přístrojů, odstranění pavučin.",
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
              label: "Četnost generálního úklidu",
              required: true,
              layout: "vertical",
              options: [
                { value: "standard", label: `Generální úklid domu 2x ročně`, coefficient: 1.0, note: "frequent" },
                { value: "quarterly", label: `Generální úklid domu 4x ročně`, coefficient: 1.0 },
                { value: "annual", label: `Generální úklid domu 1x ročně`, coefficient: 1.0 }
              ]
            },
            {
              id: "windowsPerFloor",
              type: "radio",
              label: "Orientační počet oken na patře",
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
                { value: "all", label: "Ve všech nadzemních patrech", coefficient: 1.0 },
                { value: 1, label: "1", coefficient: 0.97, hidden: true },
                { value: 2, label: "2", coefficient: 0.98, hidden: true },
                { value: 3, label: "3", coefficient: 1.0, hidden: true },
                { value: 4, label: "4", coefficient: 1.0, hidden: true },
                { value: 5, label: "5", coefficient: 1.02, hidden: true },
                { value: 6, label: "6", coefficient: 1.04, hidden: true },
                { value: 7, label: "7", coefficient: 1.06, hidden: true }
              ]
            },
            {
              id: "windowType",
              type: "checkbox",
              label: "Typ oken",
              required: true,
              layout: "vertical",
              options: [
                { value: "new", label: "Nová plastová nebo dřevěná", coefficient: 1.0 },
                { value: "original", label: "Původní dřevěná nebo hliníková", coefficient: 1.1 },
                { value: "hard-to-reach", label: "Některá jsou hůře dostupná z podlahy (nutno použít např. štafle nebo teleskopické tyče)", coefficient: 1.3 }
              ]
            },
            {
              id: "basementCleaning",
              type: "radio",
              label: "Úklid suterénních pater provádět v",
              required: true,
              layout: "vertical",
              condition: {
                operator: "and",
                conditions: [
                  { field: "generalCleaning", value: "yes", operator: "equals" },
                  { field: "undergroundFloors", value: 0, operator: "greater_than" }
                ]
              },
              options: [
                { value: "general", label: "rámci generálního úklidu", coefficient: 1.0 },
                { value: "regular", label: "rámci pravidelného úklidu", coefficient: 1.0 }
              ]
            },
            {
              id: "basementCleaningDetails",
              type: "radio",
              label: "Součástí úklidu suterénních prostor je:",
              required: true,
              layout: "vertical",
              condition: {
                operator: "and",
                conditions: [
                  { field: "generalCleaning", value: "yes", operator: "equals" },
                  { field: "undergroundFloors", value: 0, operator: "greater_than" }
                ]
              },
              options: [
                { value: "corridors-only", label: "Pouze úklid předsklepních chodeb", coefficient: 1.0 },
                { value: "corridors-and-rooms", label: "Úklid předsklepních chodeb včetně místností v suterénu, jako jsou například kočárkárny, prádelny, sušárny, kolárny apod.", coefficient: 1.1 }
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
      note: "Odklízení čerstvě napadlého sněhu, odstranění náledí a zajištění vhodného posypu chodníků a udržování těchto ploch pro chodce ve stavu, aby nedošlo k újmě na zdraví a byla zajištěna bezpečnost osob.",
      fields: [
        ...(isWinterMaintenancePeriod() ? [{
          id: "winterMaintenanceAlert",
          type: "alert" as const,
          variant: "default" as const,
          title: "Informace o zimní údržbě",
          description: `Pro zimní údržbu platí pohotovost od 15. 11. do 14. 3. následujícího roku a v tomto období jsou prováděny výjezdy – úklidu sněhu nebo náledí. Úklid sněhu se provádí, pokud je minimální sněhová pokrývka výšky 2 cm. Měsíční poplatek za pohotovostní službu: 500 Kč/měsíc. Poplatek za výjezd: 50 Kč/běžný metr nebo 40 Kč/m² (min. 300 Kč, max. 2000 Kč za výjezd).`,
          icon: "Info"
        }] : []),
        {
          id: "winterMaintenance",
          type: "radio",
          label: "",
          required: true,
          layout: "horizontal",
          options: [
            { value: "yes", label: "Ano, mám zájem i o zimní údržbu kolem domu", tooltip: "Pro zimní údržbu platí pohotovost vždy v kalendářním roce od 15. 11. do 14. 3. následujícího roku a v tomto období jsou prováděny výjezdy – úklidu sněhu nebo náledí. Úklid sněhu se provádí, pokud je minimální sněhová pokrývka výšky 2 cm. V jednom dni je možné provést maximálně 2 výjezdy (většinou ráno a poté odpoledne nebo večer). V případě úklidu chodníků se vždy provádí schůdná cestička na šířku kočárku – cca 75 cm." },
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
              id: "communicationType",
              type: "radio",
              label: "Jak chcete zadat rozměry komunikací?",
              required: true,
              layout: "vertical",
              options: [
                { value: "area", label: "Varianta plošná – plocha komunikací v m²" },
                { value: "length", label: "Varianta délková – délka komunikací v m" }
              ]
            },
            {
              id: "communicationArea",
              type: "input",
              label: "Celková plocha komunikací (v m²):",
              required: true,
              inputType: "number",
              min: 0.1,
              max: 1000,
              step: 0.1,
              placeholder: "např. 150 m²",
              description: "Zadejte hodnotu větší než 0 (max. 1 000 m²)",
              condition: { field: "communicationType", value: "area" }
            },
            {
              id: "communicationLength",
              type: "input",
              label: "Celková délka komunikací (v běžných metrech):",
              required: true,
              inputType: "number",
              min: 0.1,
              max: 1000,
              step: 0.1,
              placeholder: "např. 50 m",
              description: "Zadejte hodnotu větší než 0 (max. 1 000 m)",
              condition: { field: "communicationType", value: "length" }
            },
            {
              id: "spreadingMaterial",
              type: "radio",
              label: "Typ posypového materiálu",
              required: true,
              layout: "vertical",
              options: [
                { value: "gravel-sand", label: "Štěrkodrť nebo písek", coefficient: 1.0 },
                { value: "salt", label: "Sůl", coefficient: 1.1 },
                { value: "no-preference", label: "Bez preferencí (dle vhodnosti kombinace obou posypových materiálů)", coefficient: 1.04 }
              ]
            }
          ]
        },
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
      id: "optional-services",
      title: "Příplatkové služby",
      icon: "Plus",
      optional: true,
      fields: [
        {
          id: "optionalServicesWeekly",
          type: "checkbox",
          label: "1x týdně",
          required: false,
          options: [
            { value: "remove-debris", label: "Odstranění hrubých nečistot kolem domu (+200 Kč/měsíc)", fixedAddon: 200 },
            { value: "report-defects", label: "Hlášení závad v domě (+150 Kč/měsíc)", fixedAddon: 150 },
            { value: "sweep-under-mats", label: "Zametání a mytí podlah pod rohožkami u jednotlivých bytů (+120 Kč/měsíc)", fixedAddon: 120 },
            { value: "sweep-pathway", label: "Zametání venkovního přístupového chodníku nebo schodiště před domem, případně i zametání cest na pozemcích domu jako je dvůr nebo zahrada (+250 Kč/měsíc)", fixedAddon: 250, hidden: true },
            { value: "sweep-containers", label: "Zametení okolo kontejnerového stání včetně odstranění hrubých nečistot u kontejnerového stání (+200 Kč/měsíc)", fixedAddon: 200, hidden: true },
            { value: "clean-doormats", label: "Čistění vstupních rohoží v přízemí domu (+150 Kč/měsíc)", fixedAddon: 150, hidden: true },
            { value: "dispose-flyers", label: "Likvidace tiskovin / reklamních letáků (+50 Kč/měsíc)", fixedAddon: 50, hidden: true },
            { value: "elevator-maintenance", label: "Olejování nerezových stěn interiéru výtahu a jejich údržba (+250 Kč/měsíc)", fixedAddon: 250, hidden: true },
          ]
        },
        {
          id: "optionalServicesMonthly",
          type: "checkbox",
          label: "1x měsíčně",
          required: false,
          options: [
            { value: "remove-stickers", label: "Odstraňování samolepek (reklam) ze vstupních dveří (+90 Kč/měsíc)", fixedAddon: 90 },
            { value: "elevator-maintenance-monthly", label: "Olejování nerezových stěn interiéru výtahu a jejich údržba (+140 Kč/měsíc)", fixedAddon: 140 },
            { value: "clean-doors-handles", label: "Čištění povrchu dveří a otírání klik ve společných prostorách domu (+250 Kč/měsíc)", fixedAddon: 250 },
            { value: "clean-washable-walls", label: "Čištění omyvatelných stěn (např. linkrust) v přízemí domu (+120 Kč/měsíc)", fixedAddon: 120, hidden: true }
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
  ],
  winterPeriod: {
    start: { day: 15, month: 11 },
    end: { day: 14, month: 3 }
  }
};

// Export the calculation functions and prices for use in the calculation logic
export { BASE_PRICES, CURRENT_PRICES, FIXED_PRICES, getInflationAdjustedPrice, INFLATION_RATE, INFLATION_START_YEAR };

// Export general cleaning price getter for use in calculation
export function getGeneralCleaningPrice(type: string): number {
  const prices = CURRENT_PRICES.generalCleaning;
  switch(type) {
    case 'standard': return prices.standard;
    case 'annual': return prices.annual;
    case 'quarterly': return prices.quarterly;
    default: return prices.standard;
  }
}
