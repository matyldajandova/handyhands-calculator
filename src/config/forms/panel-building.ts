import { z } from "zod";
import { FormConfig } from "@/types/form-types";
import { isWinterMaintenancePeriod } from "@/utils/date-utils";

// Base prices and inflation
const BASE_PRICES = {
  regularCleaning: 6950, // Base price per month for regular panel building cleaning
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
  const yearsDiff = targetYear - INFLATION_START_YEAR + 1; // +1 to apply inflation starting from 2026
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
  aboveGroundFloors: z.preprocess((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    if (typeof val === 'string') {
      if (val === "13+") return val; // Keep string value for special case
      const num = parseInt(val, 10);
      return isNaN(num) ? undefined : num;
    }
    return val;
  }, z.union([z.number().min(1), z.literal("13+"), z.undefined()])).refine((val) => val !== undefined, { message: "Vyberte počet nadzemních pater" }),
  basementCleaning: z.string().min(1, "Vyberte, zda požadujete úklid suterénu"),
  entranceCount: z.preprocess((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    if (typeof val === 'string') {
      const num = parseInt(val, 10);
      return isNaN(num) ? undefined : num;
    }
    return val;
  }, z.union([z.number().min(1), z.undefined()])).refine((val) => val !== undefined, { message: "Vyberte počet jednotlivých vchodů" }),
  apartmentsPerFloor: z.string().min(1, "Vyberte orientační počet bytů na patře"),
  hasElevator: z.string().min(1, "Vyberte, zda má dům výtah"),
  generalCleaning: z.string().min(1, "Vyberte, zda požadujete generální úklid domu"),
  windowsOnLandings: z.string().optional(),
  winterMaintenance: z.string().min(1, "Vyberte, zda máte zájem o zimní údržbu"),
  communicationType: z.string().optional(),
  communicationArea: z.preprocess((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed === "") return undefined;
      const num = parseFloat(trimmed);
      return isNaN(num) ? undefined : num;
    }
    return val;
  }, z.union([z.number().min(0.1).max(10000), z.undefined()])).optional(),
  communicationLength: z.preprocess((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed === "") return undefined;
      const num = parseFloat(trimmed);
      return isNaN(num) ? undefined : num;
    }
    return val;
  }, z.union([z.number().min(0.1).max(10000), z.undefined()])).optional(),
  spreadingMaterial: z.string().optional(),
  optionalServicesWeekly: z.array(z.string()).optional(),
  optionalServicesMonthly: z.array(z.string()).optional(),
  zipCode: z.string().min(1, "Zadejte PSČ").regex(/^\d{5}$/, "PSČ musí mít přesně 5 čísel"),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  // Validate general cleaning details when general cleaning is "yes"
  if (data.generalCleaning === "yes") {
    if (!data.windowsOnLandings) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vyberte, zda jsou v domě okna na podestách",
        path: ["windowsOnLandings"]
      });
    }
  }
  
  // Validate winter maintenance details when winter maintenance is "yes"
  if (data.winterMaintenance === "yes") {
    if (!data.communicationType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vyberte způsob zadání rozměrů komunikací",
        path: ["communicationType"]
      });
    }
    
    if (data.communicationType === "area") {
      if (!data.communicationArea || (typeof data.communicationArea === 'number' && data.communicationArea <= 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Zadejte plochu komunikací",
          path: ["communicationArea"]
        });
      }
    }
    
    if (data.communicationType === "length") {
      if (!data.communicationLength || (typeof data.communicationLength === 'number' && data.communicationLength <= 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Zadejte délku komunikací",
          path: ["communicationLength"]
        });
      }
    }
    
    if (!data.spreadingMaterial) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vyberte typ posypového materiálu",
        path: ["spreadingMaterial"]
      });
    }
  }
});

export const panelBuildingFormConfig: FormConfig = {
  id: "panel-building",
  title: "Pravidelný úklid panelových domů a vícevchodových bytových domů",
  description: `Vyplňte údaje pro výpočet ceny úklidových služeb pro panelové domy a vícevchodové bytové domy.`,
  tooltip: "Jedná se např. o zděné bytové domy, které mají víc vchodů – tedy víc jak jedno schodiště a každý vchod má své popisné nebo orientační číslo. V poptávkovém formuláři se pro zjednodušení tyto domy zařazují pod pojem „panelové domy“.",
  validationSchema: panelBuildingSchema,
  basePrice: CURRENT_PRICES.regularCleaning,
  conditions: [
    "Dostupnost alespoň studené vody v domě",
    "Uzamykatelná místnost nebo uzamykatelná část domu (místo) na úklidové náčiní a úklidovou chemii"
  ],
  commonServices: {
    perCleaning: [
      "zametání a mytí schodů, podest a chodeb ve všech patrech domu včetně přízemí",
      "otírání madel zábradlí a okenních parapetů",
      "mytí podlahy výtahové kabiny včetně leštění zrcadla (pokud je výtah v domě)",
      "čištění drážek v pojezdech výtahových dveří (pokud je výtah v domě)",
      "oboustranné mytí vchodových dveří od otisků prstů a odstranění letáků",
      "úklid a udržování čistoty v úklidových komorách"
    ],
    monthly: [
      "vysmýčení pavučin v běžně dostupných výškách",
      "mytí poštovních schránek",
      "odstranění prachu z hasících přístrojů a jejich mytí"
    ],
    generalCleaning: [
      "oboustranné mytí otevíravých částí oken včetně jejich rámů a parapetů ve společných prostorách domu",
      "očištění osvětlení zvenčí",
      "důkladný úklid suterénu domu (pokud má dům suterén)",
      "čištění celé konstrukce zábradlí",
      "mytí prosklenných částí v přízemi domu",
      "setření prachu z hydrantů, mytí omyvatelných částí revizních dvířek, vypínačů a tech. rozvodů"
    ]
  },
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
            { value: "mixed-weekly", label: "1x týdně nadzemní patra a 2x týdně přízemí", coefficient: 1.45, hidden: true, tooltip: "Kromě přízemí domu se myslí také úklid podlahy výtahové kabiny, pokud je v domě výtah." },
            { value: "seasonal", label: "1x týdně v letním období a 2x týdně v zimním období", coefficient: 1.35, hidden: true, tooltip: "Letním obdobím se rozumí období od 1. dubna do 30. září a zimním obdobím se myslí období od 1. října do 31. března." }
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
          label: "Počet nadzemních pater v panelovém domě včetně přízemí",
          required: true,
          layout: "vertical",
          options: [
            { value: 3, label: "3 (tedy 2 nadzemní patra a přízemí)", coefficient: 0.68 },
            { value: 4, label: "4", coefficient: 0.72 },
            { value: 5, label: "5", coefficient: 0.77 },
            { value: 6, label: "6", coefficient: 0.83 },
            { value: 7, label: "7", coefficient: 0.94 },
            { value: 8, label: "8", coefficient: 1.04 },
            { value: 9, label: "9", coefficient: 1.15 },
            { value: 10, label: "10", coefficient: 1.28 },
            { value: 11, label: "11", coefficient: 1.45 },
            { value: 12, label: "12", coefficient: 1.61 },
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
            { value: "yes", label: "Ano", coefficient: 1.02 },
            { value: "no", label: "Ne", coefficient: 0.96 }
          ]
        },
        {
          id: "entranceCount",
          type: "radio",
          label: "Počet jednotlivých vchodů (schodišť) v panelovém domě",
          note: "Vchody se myslí jednotlivé vstupy do domu, zpravidla by měl mít každý vchod vlastní číslo orientační nebo číslo popisné.",
          required: true,
          layout: "vertical",
          options: [
            { value: 1, label: "1", coefficient: 0.5 },
            { value: 2, label: "2", coefficient: 0.766 },
            { value: 3, label: "3", coefficient: 1.0 },
            { value: 4, label: "4", coefficient: 1.3 },
            { value: 5, label: "5", coefficient: 1.6 },
            { value: 6, label: "6", coefficient: 1.88 },
            { value: 7, label: "7", coefficient: 2.12 }
          ]
        },
        {
          id: "apartmentsPerFloor",
          type: "radio",
          label: "Orientační počet bytů na patře",
          note: "Tento údaj můžete určit také tak, že celkový počet bytů v domě vydělíte počtem pater. Nejčastěji bývají 3 byty na patře.",
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
            { value: "no", label: "Ne", coefficient: 1.07 }
          ]
        }
      ]
    },
    {
      id: "general-cleaning",
      title: "Požadavek generálního úklidu domu",
      icon: "Sparkles",
      note: "Generálním úklidem se myslí zejména oboustranné mytí oken včetně jejich rámů a parapetů ve všech společných prostorech domu, celoplošné mytí vchodových dveří, odstranění samolepek, mytí osvětlovacích zařízení z vnější části, mytí vypínačů, poštovních schránek, hasících přístrojů, odstranění pavučin.",
      fields: [
        {
          id: "generalCleaning",
          type: "radio",
          label: "Generální úklid domu 2x ročně",
          required: true,
          layout: "horizontal",
          options: [
            { value: "yes", label: "Ano", coefficient: 1.065 },
            { value: "no", label: "Ne", coefficient: 0.95 }
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
              id: "windowsOnLandings",
              type: "radio",
              label: "Okna na podestách schodišť",
              required: true,
              layout: "horizontal",
              options: [
                { value: "yes", label: "Ano", coefficient: 1.0 },
                { value: "no", label: "Ne, v nadzemních společných prostorech domu se okna nevyskytují a v ceně generálního úklidu není započítané mytí oken (okna se mohou vyskytovat pouze v rámci vstupního parteru domu v přízemí).", coefficient: 0.4 }
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
          description: `Pro zimní údržbu držíme pohotovost od 15. 11. do 14. 3. následujícího roku a v tomto období jsou prováděny výjezdy – úklidu sněhu nebo náledí. Úklid sněhu se provádí, pokud je minimální sněhová pokrývka výšky 1 až 2 cm. Měsíční poplatek za pohotovostní službu: 500 Kč/měsíc. Poplatek za výjezd: 50 Kč/běžný metr nebo 40 Kč/m² (min. 300 Kč, max. 2000 Kč za výjezd).`,
          icon: "Info"
        }] : []),
        {
          id: "winterMaintenance",
          type: "radio",
          label: "",
          required: true,
          layout: "horizontal",
          options: [
            { value: "yes", label: "Ano, mám zájem i o zimní údržbu kolem domu", tooltip: "Pro zimní údržbu držíme pohotovost vždy v kalendářním roce od 15. 11. do 14. 3. následujícího roku a v tomto období jsou prováděny výjezdy – úklidu sněhu nebo náledí. Úklid sněhu se provádí, pokud je minimální sněhová pokrývka výšky 1 až 2 cm. V jednom dni je možné provést maximálně 2 výjezdy (většinou ráno a poté odpoledne nebo večer). V případě úklidu chodníků se vždy provádí schůdná cestička na šířku kočárku – cca 75 cm. Pozn.: jedná se o menší plochy pro chůzi, které jsou uklízeny ručně hrably apod., nikoli strojní mechanizací." },
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
                { value: "area", label: "Plocha (m²)" },
                { value: "length", label: "Délka (m)" }
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
      id: "optional-services",
      title: "Příplatkové služby",
      icon: "Plus",
      optional: true,
      fields: [
        {
          id: "optionalServicesWeekly",
          type: "checkbox",
          label: "Při každém úklidu",
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
            { value: "remove-stickers", label: "Odstraňování samolepek (reklam) ze vstupních dveří (90 Kč/měsíc)", fixedAddon: 90 },
            { value: "elevator-maintenance-monthly", label: "Olejování nerezových stěn interiéru výtahu a jejich údržba (140 Kč/měsíc)", fixedAddon: 140 },
            { value: "clean-doors-handles", label: "Čištění povrchu dveří a otírání klik ve společných prostorách domu (250 Kč/měsíc)", fixedAddon: 250 },
            { value: "clean-washable-walls", label: "Čištění omyvatelných stěn (např. linkrust) v přízemí domu (120 Kč/měsíc)", fixedAddon: 120, hidden: true }
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
  ],
  winterPeriod: {
    start: { day: 15, month: 11 },
    end: { day: 14, month: 3 }
  }
};

// Export the calculation functions and prices for use in the calculation logic
export { BASE_PRICES, CURRENT_PRICES, FIXED_PRICES, getInflationAdjustedPrice, INFLATION_RATE, INFLATION_START_YEAR };
