import { ServiceType } from "@/types/form-types";
import { residentialBuildingFormConfig } from "./forms/residential-building";
import { officeCleaningFormConfig } from "./forms/office-cleaning";
import { panelBuildingFormConfig } from "./forms/panel-building";
import { commercialSpacesFormConfig } from "./forms/commercial-spaces";
import { homeCleaningFormConfig } from "./forms/home-cleaning";
import { oneTimeCleaningFormConfig } from "./forms/one-time-cleaning";
import { handymanServicesFormConfig } from "./forms/handyman-services";

export const serviceTypes: ServiceType[] = [
  {
    id: "residential-building",
    title: "Pravidelný úklid činžovních domů, bytových novostaveb",
    description: "Zahrnuje vše od úklidu společných prostor činžovních (zděných) domů po zimní údržbu s pokročilými koeficienty.",
    icon: "Building",
    formConfig: residentialBuildingFormConfig,
  },  
  {
    id: "panel-building",
    title: "Pravidelný úklid panelových domů",
    description: "Zahrnuje vše od úklidu společných prostor panelových domů po zimní údržbu s pokročilými koeficienty.",
    icon: "Building",
    formConfig: panelBuildingFormConfig,
  },
  {
    id: "office-cleaning",
    title: "Pravidelný úklid kanceláří",
    description: "Zahrnuje hodinový i plošný výpočet prostor kanceláří s pokročilými koeficienty.",
    icon: "Building2",
    formConfig: officeCleaningFormConfig,
  },
  {
    id: "commercial-spaces",
    title: "Pravidelný úklid komerčních nebytových (retailových) prostorů",
    description: "Zahrnuje výpočet cen pravidelných úklidů prodejen, showroomů, skladů, fitness, kadeřnictví, ordinací, školek, restaurací, barů, kaváren...",
    icon: "Store",
    formConfig: commercialSpacesFormConfig,
  },
  {
    id: "home-cleaning",
    title: "Pravidelný úklid domácností",
    description: "Přesný výpočet ceny pro pravidelné úklidy domácností.",
    icon: "Home",
    formConfig: homeCleaningFormConfig,
  },
  {
    id: "one-time-cleaning",
    title: "Jednorázový úklid",
    description: "Výpočet ceny jednorázového úklidu podle délky jeho zhodnocení a zahrnutí dopravy a úklidové chemie.",
    icon: "Clock",
    formConfig: oneTimeCleaningFormConfig,
  },
  {
    id: "handyman-services",
    title: "Mytí oken a ostatní služby",
    description: "Výpočet ceny řemeslných prací podle délky jejich zhodnocení a zahrnutí dopravy a potřebného náčiní.",
    icon: "Wrench",
    formConfig: handymanServicesFormConfig,
  },

];

export function getServiceType(idOrSlug: string): ServiceType | undefined {
  return serviceTypes.find(service => service.id === idOrSlug);
}

export function getFormConfig(serviceIdOrSlug: string) {
  const service = getServiceType(serviceIdOrSlug);
  return service?.formConfig || null;
}
