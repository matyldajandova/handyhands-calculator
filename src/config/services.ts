import { ServiceType } from "@/types/form-types";
import { residentialBuildingFormConfig } from "./forms/residential-building";

export const serviceTypes: ServiceType[] = [
  {
    id: "a",
    title: "Činžovní domy, novostavby",
    description: "Kalkulátor úklidových služeb pro bytové domy a novostavby",
    icon: "Building",
    formConfig: residentialBuildingFormConfig
  },
  {
    id: "b",
    title: "Rodinné domy",
    description: "Kalkulátor úklidových služeb pro rodinné domy",
    icon: "Home",
    formConfig: null // TODO: Add form config
  },
  {
    id: "c",
    title: "Kancelářské budovy",
    description: "Kalkulátor úklidových služeb pro kancelářské prostory",
    icon: "Building2",
    formConfig: null // TODO: Add form config
  },
  {
    id: "d",
    title: "Obchodní prostory",
    description: "Kalkulátor úklidových služeb pro obchody a nákupní centra",
    icon: "Store",
    formConfig: null // TODO: Add form config
  },
  {
    id: "e",
    title: "Průmyslové objekty",
    description: "Kalkulátor úklidových služeb pro továrny a sklady",
    icon: "Factory",
    formConfig: null // TODO: Add form config
  },
  {
    id: "f",
    title: "Školy a vzdělávací zařízení",
    description: "Kalkulátor úklidových služeb pro školy a univerzity",
    icon: "School",
    formConfig: null // TODO: Add form config
  },
  {
    id: "g",
    title: "Zdravotnická zařízení",
    description: "Kalkulátor úklidových služeb pro nemocnice a kliniky",
    icon: "Warehouse",
    formConfig: null // TODO: Add form config
  },
  {
    id: "i",
    title: "Individuální cenová nabídka",
    description: "Nahrajte dokument a získejte individuální cenovou nabídku",
    icon: "FileText",
    formConfig: null // TODO: Add form config
  }
];

export function getServiceType(id: string): ServiceType | undefined {
  return serviceTypes.find(service => service.id === id);
}

export function getFormConfig(serviceId: string) {
  const service = getServiceType(serviceId);
  return service?.formConfig || null;
}
