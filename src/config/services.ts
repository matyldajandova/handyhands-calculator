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
    title: "Činžovní domy, novostavby",
    description: "Zahrnuje vše od základního úklidu po zimní údržbu.",
    icon: "Building",
    formConfig: residentialBuildingFormConfig,
  },
  {
    id: "office-cleaning",
    title: "Pravidelný úklid kanceláří",
    description: "Zahrnuje hodinový i plošný výpočet s pokročilými koeficienty.",
    icon: "Building2",
    formConfig: officeCleaningFormConfig,
  },
  {
    id: "panel-building",
    title: "Pravidelný úklid panelových domů",
    description: "Zahrnuje všechny specifické koeficienty pro panelové stavby.",
    icon: "Building",
    formConfig: panelBuildingFormConfig,
  },
  {
    id: "commercial-spaces",
    title: "Pravidelný úklid komerčních nebytových prostorů",
    description: "Prodejny, sklady, fitness, kadeřnictví, ordinace, školky, restaurace, bary, kavárny…",
    icon: "Store",
    formConfig: commercialSpacesFormConfig,
  },
  {
    id: "home-cleaning",
    title: "Pravidelný úklid domácností",
    description: "Jednoduchý výpočet pro individuální zákazníky.",
    icon: "Home",
    formConfig: homeCleaningFormConfig,
  },
  {
    id: "one-time-cleaning",
    title: "Jednorázový úklid",
    description: "Hodinová sazba s minimálními cenami podle plochy a dopravou.",
    icon: "Clock",
    formConfig: oneTimeCleaningFormConfig,
  },
  {
    id: "handyman-services",
    title: "Řemeslné služby",
    description: "Hodinová sazba s minimálními cenami podle časové náročnosti a dopravou.",
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
