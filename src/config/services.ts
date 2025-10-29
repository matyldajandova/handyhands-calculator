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
    title: "Pravidelný úklid činžovních domů a bytových novostaveb",
    description: "Vše od úklidu společných prostor činžovních (zděných) domů po zimní údržbu s pokročilými koeficienty.",
    icon: "Home",
    formConfig: residentialBuildingFormConfig,
  },  
  {
    id: "panel-building",
    title: "Pravidelný úklid panelových domů a vícevchodových bytových domů",
    description: "Vše od úklidu společných prostor panelových domů a vícevchodových bytových domů po zimní údržbu s pokročilými koeficienty.",
    icon: "Building",
    formConfig: panelBuildingFormConfig,
  },
  {
    id: "office-cleaning",
    title: "Pravidelný úklid kancelářských prostor",
    description: "Hodinový i plošný výpočet úklidu prostor kanceláří s pokročilými koeficienty.",
    icon: "Building2",
    formConfig: officeCleaningFormConfig,
  },
  {
    id: "commercial-spaces",
    title: "Pravidelný úklid komerčních nebytových (retailových) prostor",
    description: "Výpočet cen pravidelných úklidů prodejen, skladů, fitness, kadeřnictví, ordinací, školek, restaurací, barů, kaváren, atd. s pokročilými koeficienty.",
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
    title: "Jednorázový úklid jakékoliv nemovitosti",
    description: "Přesný výpočet ceny jednorázového úklidu podle délky jeho zhodnocení a zahrnutí dopravy a úklidové chemie + náčiní.",
    icon: "BrushCleaning",
    formConfig: oneTimeCleaningFormConfig,
  },
  {
    id: "handyman-services",
    title: "Mytí oken a ostatní služby včetně zahradních",
    description: "Přesný výpočet ceny mytí oken, výloh, žaluzií. Dále základní zahradnické práce, jako např. sekání trávníků nebo zimní údržbu chodníků a komunikací.",
    icon: "Bubbles",
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


