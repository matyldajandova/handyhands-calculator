"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { getFormConfig, getServiceType } from "@/config/services";

export type AppState = "service-selection" | "form" | "calculating" | "success";

interface AppContextType {
  appState: AppState;
  selectedService: string;
  formData: any;
  calculationResult: any;
  hasFormChanges: boolean;
  showWarningDialog: boolean;
  handleServiceTypeSelect: (serviceType: string) => void;
  handleBackToServiceSelection: () => void;
  handleFormSubmit: (data: any) => void;
  handleCalculationComplete: (result: any) => void;
  handleFormChange: () => void;
  handleWarningDialogConfirm: () => void;
  handleWarningDialogCancel: () => void;
  handleBackButtonClick: () => void;
  getFormConfig: (serviceType: string) => any;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [appState, setAppState] = useState<AppState>("service-selection");
  const [selectedService, setSelectedService] = useState<string>("");
  const [formData, setFormData] = useState<any>(null);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [hasFormChanges, setHasFormChanges] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);

  const handleServiceTypeSelect = useCallback((serviceType: string) => {
    console.log("handleServiceTypeSelect called with:", serviceType);
    
    const service = getServiceType(serviceType);
    if (!service || !service.formConfig) {
      console.log("Service not found or no form config:", serviceType);
      return;
    }

    setSelectedService(serviceType);
    setAppState("form");
    setHasFormChanges(false);
  }, []);

  const handleBackToServiceSelection = useCallback(() => {
    console.log("handleBackToServiceSelection called");
    
    // Clear state immediately
    setAppState("service-selection");
    setSelectedService("");
    setFormData(null);
    setCalculationResult(null);
    setHasFormChanges(false);
  }, []);

  const handleFormSubmit = useCallback((data: any) => {
    console.log("handleFormSubmit called with:", data);
    
    setFormData(data);
    setAppState("calculating");
  }, []);

  const handleCalculationComplete = useCallback((result: any) => {
    console.log("handleCalculationComplete called with:", result);
    
    setCalculationResult(result);
    setAppState("success");
  }, []);

  const handleFormChange = useCallback(() => {
    if (!hasFormChanges) {
      setHasFormChanges(true);
    }
  }, [hasFormChanges]);

  const handleWarningDialogConfirm = useCallback(() => {
    setShowWarningDialog(false);
    handleBackToServiceSelection();
  }, []);

  const handleWarningDialogCancel = useCallback(() => {
    setShowWarningDialog(false);
  }, []);

  const handleBackButtonClick = useCallback(() => {
    if (hasFormChanges) {
      setShowWarningDialog(true);
    } else {
      handleBackToServiceSelection();
    }
  }, [hasFormChanges]);

  const getFormConfig = useCallback((serviceType: string) => {
    const service = getServiceType(serviceType);
    return service?.formConfig || null;
  }, []);

  const value: AppContextType = {
    appState,
    selectedService,
    formData,
    calculationResult,
    hasFormChanges,
    showWarningDialog,
    handleServiceTypeSelect,
    handleBackToServiceSelection,
    handleFormSubmit,
    handleCalculationComplete,
    handleFormChange,
    handleWarningDialogConfirm,
    handleWarningDialogCancel,
    handleBackButtonClick,
    getFormConfig,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
