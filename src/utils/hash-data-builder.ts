/**
 * Utility for building consistent hash data objects
 */

import { CalculationResult, FormConfig, FormSubmissionData } from "@/types/form-types";
import { PoptavkaHashData } from "@/utils/hash-generator";
import { getOrCreateOrderId } from "@/services/order-id-service";

export interface HashDataBuilderOptions {
  serviceType?: string;
  serviceTitle?: string;
  totalPrice: number;
  currency?: string;
  calculationResult: CalculationResult;
  formData: FormSubmissionData;
  formConfig?: FormConfig | null;
  timestamp?: number;
  orderId?: string;
}

/**
 * Build a consistent hash data object for poptavka navigation
 */
export function buildPoptavkaHashData(options: HashDataBuilderOptions): PoptavkaHashData {
  const {
    serviceType = 'Ostatní služby',
    serviceTitle = 'Ostatní služby',
    totalPrice,
    currency = 'Kč',
    calculationResult,
    formData,
    formConfig,
    timestamp = Date.now(),
    orderId
  } = options;

  // Use existing order ID from calculation result if not provided
  const finalOrderId = orderId || calculationResult?.orderId || getOrCreateOrderId();

  return {
    serviceType: formConfig?.id || serviceType,
    serviceTitle: formConfig?.title || serviceTitle,
    totalPrice,
    currency,
    calculationData: {
      ...calculationResult,
      timestamp,
      price: totalPrice,
      serviceTitle: formConfig?.title || serviceTitle,
      formData,
      orderId: finalOrderId
    }
  };
}
