/*
  Test that building the results hash does NOT leak poptavka notes from localStorage
  Run: npx tsx scripts/test-notes-results-hash.ts
*/

import { orderStorage } from "@/services/order-storage";
import { buildPoptavkaHashData } from "@/utils/hash-data-builder";
import type { CalculationResult, FormConfig } from "@/types/form-types";

function createMockFormConfig(): FormConfig {
  return {
    id: "residential-building",
    title: "Pravidelný úklid činžovních domů a novostaveb",
    description: "",
    sections: [],
    validationSchema: {} as unknown as FormConfig["validationSchema"],
  };
}

function createMockCalculationResult(): CalculationResult {
  return {
    regularCleaningPrice: 2000,
    totalMonthlyPrice: 2000,
    calculationDetails: {
      basePrice: 1500,
      appliedCoefficients: [],
      finalCoefficient: 1,
    },
    orderId: "hash_test_order",
  };
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function run() {
  // Seed localStorage with old poptavka note
  orderStorage.clear();
  orderStorage.updateCustomerAndPoptavka(
    { firstName: "Old", lastName: "User", email: "old@example.com" },
    { notes: "Z POPTAVKY OLD" } as any
  );

  const formConfig = createMockFormConfig();
  const calc = createMockCalculationResult();

  // Simulate building the results hash in success-screen by merging existing poptavka data
  const orderData = orderStorage.get();
  const existingPoptavkaData = (orderData?.poptavka || {}) as Record<string, unknown>;
  const { notes: _oldNotes, serviceStartDate: _oldDate, ...existingPoptavkaDataClean } = existingPoptavkaData;
  const { notes: _formNotes, ...formDataWithoutNotes } = { cleaningFrequency: "weekly" } as Record<string, unknown>;

  const enhancedFormData = {
    ...formDataWithoutNotes,
    ...existingPoptavkaDataClean,
    firstName: "New",
    lastName: "User",
    email: "new@example.com",
  };

  const hashData = buildPoptavkaHashData({
    totalPrice: calc.totalMonthlyPrice,
    calculationResult: calc,
    formData: enhancedFormData as any,
    formConfig,
    orderId: calc.orderId,
  });

  // Expect NO notes inside formData in the hash
  const fd = hashData.calculationData?.formData as Record<string, unknown>;
  assert(!fd || typeof fd.notes === 'undefined', 'Form notes must not be set when building results hash');
  console.log('Results-hash test passed: no poptavka notes leaked into formData.');
}

run().catch(err => { console.error(err); process.exit(1); });


