import { z } from "zod";
import { FormConfig } from "@/types/form-types";
import { 
  Calendar, 
  Building, 
  Warehouse, 
  Home, 
  ArrowUpDown, 
  Droplets, 
  Sparkles, 
  Snowflake,
  MapPin,
  Info
} from "lucide-react";

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
  floorsWithWindows: z.number().optional(),
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
  description: "Vyplňte údaje pro výpočet ceny úklidových služeb. Všechny údaje jsou důležité pro přesný výpočet.",
  validationSchema: residentialBuildingSchema,
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
            { value: "biweekly", label: "1x za 14 dní", coefficient: 0.85, note: "recommended" },
            { value: "monthly", label: "1x za měsíc", coefficient: 0.69 },
            { value: "quarterly", label: "1x za 3 měsíce", coefficient: 0.52 },
            { value: "semiannual", label: "1x za 6 měsíců", coefficient: 0.35 },
            { value: "annual", label: "1x za rok", coefficient: 0.18 }
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
            { value: 1, label: "1 patro (přízemí)" },
            { value: 2, label: "2 patra" },
            { value: 3, label: "3 patra" },
            { value: 4, label: "4 patra" },
            { value: 5, label: "5 pater" },
            { value: 6, label: "6 pater" },
            { value: 7, label: "7 pater" },
            { value: 8, label: "8 pater" },
            { value: 9, label: "9 pater" },
            { value: 10, label: "10 pater" },
            { value: 11, label: "11 pater" },
            { value: 12, label: "12 pater" }
          ]
        },
        {
          id: "undergroundFloors",
          type: "radio",
          label: "Počet podzemních pater v domě",
          required: true,
          layout: "vertical",
          options: [
            { value: 0, label: "Žádné" },
            { value: 1, label: "1 patro" },
            { value: 2, label: "2 patra" },
            { value: 3, label: "3 patra" },
            { value: 4, label: "4 patra" }
          ]
        },
        {
          id: "apartmentsPerFloor",
          type: "radio",
          label: "Orientáční počet bytů na patře",
          required: true,
          layout: "vertical",
          options: [
            { value: "1-2", label: "1-2 byty" },
            { value: "3-4", label: "3-4 byty" },
            { value: "5-6", label: "5-6 bytů" },
            { value: "7-8", label: "7-8 bytů" },
            { value: "9-10", label: "9-10 bytů" },
            { value: "11+", label: "11+ bytů" }
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
            { value: "yes", label: "Ano" },
            { value: "no", label: "Ne" }
          ]
        },
        {
          id: "hasHotWater",
          type: "radio",
          label: "Teplá voda v úklidové místnosti",
          required: true,
          layout: "horizontal",
          options: [
            { value: "yes", label: "Ano" },
            { value: "no", label: "Ne, pro potřeby úklidu pouze studená voda" }
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
            { value: "no", label: "Ne" }
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
                { value: "all-floors", label: "ve všech nadzemních patrech", note: "recommended" },
                { value: "ground-floor", label: "pouze v přízemí" },
                { value: "selected-floors", label: "v konkrétních patrech" }
              ]
            },
            {
              id: "windowsPerFloor",
              type: "radio",
              label: "Počet oken na patře",
              required: true,
              layout: "vertical",
              options: [
                { value: 1, label: "1-5 oken" },
                { value: 2, label: "6-10 oken" },
                { value: 3, label: "11-15 oken" },
                { value: 4, label: "16-20 oken" },
                { value: 5, label: "21+ oken" }
              ]
            },
            {
              id: "floorsWithWindows",
              type: "radio",
              label: "Počet pater, kde jsou okna",
              required: true,
              layout: "vertical",
              options: [
                { value: 1, label: "1 patro" },
                { value: 2, label: "2 patra" },
                { value: 3, label: "3 patra" },
                { value: 4, label: "4 patra" },
                { value: 5, label: "5+ pater" }
              ]
            },
            {
              id: "windowType",
              type: "radio",
              label: "Typ oken",
              required: true,
              layout: "vertical",
              options: [
                { value: "standard", label: "standardní okna" },
                { value: "large", label: "velká okna" },
                { value: "balcony", label: "balkónové dveře" },
                { value: "skylight", label: "střešní okna" }
              ]
            },
            {
              id: "basementCleaning",
              type: "radio",
              label: "Úklid suterénních pater provádět v",
              required: true,
              layout: "vertical",
              options: [
                { value: "general", label: "rámci generálního úklidu" },
                { value: "regular", label: "rámci pravidelného úklidu" }
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
            { value: "prague", label: "Praha" },
            { value: "brno", label: "Brno" },
            { value: "ostrava", label: "Ostrava" },
            { value: "plzen", label: "Plzeň" },
            { value: "liberec", label: "Liberec" },
            { value: "olomouc", label: "Olomouc" },
            { value: "usti", label: "Ústí nad Labem" },
            { value: "hradec", label: "Hradec Králové" },
            { value: "ceske-budejovice", label: "České Budějovice" },
            { value: "pardubice", label: "Pardubice" },
            { value: "zlin", label: "Zlín" },
            { value: "jihlava", label: "Jihlava" },
            { value: "karlovy-vary", label: "Karlovy Vary" },
            { value: "other", label: "Jiné město" }
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
