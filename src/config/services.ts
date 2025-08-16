import { ServiceType } from "@/types/form-types";
import { residentialBuildingFormConfig } from "./forms/residential-building";
import { officeCleaningFormConfig } from "./forms/office-cleaning";

export const serviceTypes: ServiceType[] = [
  {
    id: "residential-building",
    title: "Činžovní domy, novostavby",
    description: "Kalkulátor cen za údržbu činžovních domů a novostaveb. Zahrnuje vše od základního úklidu po zimní údržbu.",
    icon: "Building",
    formConfig: residentialBuildingFormConfig,
  },
  {
    id: "office-cleaning",
    title: "Pravidelný úklid kanceláří",
    description: "Kalkulátor cen za pravidelný úklid kanceláří. Zahrnuje hodinový i plošný výpočet s pokročilými koeficienty.",
    icon: "Building2",
    formConfig: officeCleaningFormConfig,
  },
  {
    id: "family-homes",
    title: "Rodinné domy",
    description: "Kalkulátor cen za údržbu rodinných domů. Optimalizováno pro menší objekty s individuálním přístupem.",
    icon: "Home",
    formConfig: null, // Will be implemented later
  },
  {
    id: "office-buildings",
    title: "Kancelářské budovy",
    description: "Kalkulátor cen za údržbu kancelářských budov. Zahrnuje specializované služby pro komerční prostory.",
    icon: "Building2",
    formConfig: null, // Will be implemented later
  },
  {
    id: "warehouses",
    title: "Sklady a logistické centra",
    description: "Kalkulátor cen za údržbu skladů a logistických center. Optimalizováno pro velké plochy.",
    icon: "Warehouse",
    formConfig: null, // Will be implemented later
  },
  {
    id: "retail-spaces",
    title: "Prodejní prostory",
    description: "Kalkulátor cen za údržbu prodejních prostor. Zahrnuje specializované služby pro retail.",
    icon: "Store",
    formConfig: null, // Will be implemented later
  },
  {
    id: "industrial-facilities",
    title: "Průmyslové objekty",
    description: "Kalkulátor cen za údržbu průmyslových objektů. Optimalizováno pro náročné prostředí.",
    icon: "Factory",
    formConfig: null, // Will be implemented later
  },
  {
    id: "educational-institutions",
    title: "Vzdělávací instituce",
    description: "Kalkulátor cen za údržbu škol a univerzit. Zahrnuje specializované služby pro vzdělávací prostředí.",
    icon: "School",
    formConfig: null, // Will be implemented later
  },
  {
    id: "healthcare-facilities",
    title: "Zdravotnická zařízení",
    description: "Kalkulátor cen za údržbu nemocnic a klinik. Zahrnuje hygienické standardy a dezinfekci.",
    icon: "FileText",
    formConfig: null, // Will be implemented later
  },
];

export function getServiceType(idOrSlug: string): ServiceType | undefined {
  return serviceTypes.find(service => service.id === idOrSlug);
}

export function getFormConfig(serviceIdOrSlug: string) {
  const service = getServiceType(serviceIdOrSlug);
  return service?.formConfig || null;
}
