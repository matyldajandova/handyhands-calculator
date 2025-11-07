/*
  Comprehensive test runner for verifying correct separation of notes in the FULL flow.
  This tests the actual hash decoding and PDF generation flow, not just the conversion function.
  Run with: npx tsx scripts/test-notes-full-flow.ts
*/

import { hashService } from "@/services/hash-service";
import { orderStorage } from "@/services/order-storage";
import { convertFormDataToOfferData } from "@/utils/form-to-offer-data";
import { renderOfferPdfBody } from "@/pdf/templates/OfferPDF";
import type { CalculationResult, FormConfig, FormSubmissionData } from "@/types/form-types";
import { buildPoptavkaHashData } from "@/utils/hash-data-builder";

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
    orderId: "test_order_123",
  };
}

function expectContains(html: string, needle: string, message: string) {
  if (!html.includes(needle)) {
    throw new Error(`FAIL: ${message}\nExpected to find: ${needle}\nHTML snippet: ${html.substring(0, 500)}`);
  }
}

function expectNotContains(html: string, needle: string, message: string) {
  if (html.includes(needle)) {
    throw new Error(`FAIL: ${message}\nExpected NOT to find: ${needle}\nHTML snippet: ${html.substring(0, 500)}`);
  }
}

async function testFullFlow({ formNote, poptavkaNote, previousPoptavkaNote }: { 
  formNote?: string; 
  poptavkaNote?: string;
  previousPoptavkaNote?: string; // Simulates old note in localStorage
}) {
  // Clear localStorage first
  orderStorage.clear();
  
  // Simulate previous order's poptavka note in localStorage (if testing persistence issue)
  if (previousPoptavkaNote) {
    orderStorage.updateCustomerAndPoptavka(
      { firstName: "Old", lastName: "User", email: "old@example.com" },
      {} // No notes in localStorage anymore
    );
  }
  
  const formConfig = createMockFormConfig();
  const calc = createMockCalculationResult();
  
  // Build form data with form note AND poptavkaNote (simulating hash that has both)
  const formData: FormSubmissionData = {
    cleaningFrequency: "weekly",
    ...(formNote ? { notes: formNote } : {}),
    ...(poptavkaNote ? { poptavkaNotes: poptavkaNote } : {}), // Add poptavkaNotes to formData
  };
  
  // Build hash data (simulating what happens when user fills form and goes to /vysledek)
  const hashData = buildPoptavkaHashData({
    serviceType: formConfig.id,
    serviceTitle: formConfig.title,
    totalPrice: calc.totalMonthlyPrice,
    currency: "Kč",
    calculationResult: calc,
    formData: formData,
    formConfig: formConfig,
    orderId: calc.orderId,
  });
  
  // Generate hash
  const hash = hashService.generateHash(hashData);
  
  // Decode hash (simulating /vysledek page load)
  const decodedData = hashService.decodeHash(hash);
  if (!decodedData || !decodedData.calculationData) {
    throw new Error("Failed to decode hash");
  }
  
  // Extract form data from decoded hash
  const decodedFormData = decodedData.calculationData.formData as FormSubmissionData;
  
  // Verify poptavkaNotes is in the decoded hash
  if (poptavkaNote && !(decodedFormData as Record<string, unknown>).poptavkaNotes) {
    throw new Error(`FAIL: poptavkaNotes "${poptavkaNote}" not found in decoded hash`);
  }
  
  // Simulate PDF download from /vysledek (like success-screen.tsx does)
  const orderData = orderStorage.get();
  const existingPoptavkaData = (orderData?.poptavka || {}) as Record<string, unknown>;
  
  // Exclude notes from existingPoptavkaData (like we do in success-screen)
  const { notes: _oldNotes, serviceStartDate: _oldDate, ...existingPoptavkaDataClean } = existingPoptavkaData;
  // Extract form notes and poptavkaNotes BEFORE excluding them
  const formNotes = typeof decodedFormData.notes === 'string' ? decodedFormData.notes : undefined;
  const poptavkaNotes = typeof (decodedFormData as Record<string, unknown>).poptavkaNotes === 'string' 
    ? (decodedFormData as Record<string, unknown>).poptavkaNotes as string 
    : undefined;
  
  // CRITICAL: Exclude notes and poptavkaNotes from formData before spreading into enhancedCustomerData
  const { serviceStartDate: _date, notes: _formNotes, poptavkaNotes: _poptavkaNotes, ...formDataWithoutDateAndNotes } = decodedFormData;
  
  const enhancedCustomerData = {
    ...existingPoptavkaDataClean,
    firstName: "Test",
    lastName: "User",
    email: "test@example.com",
    calculationResult: calc,
    formConfig: formConfig,
    serviceType: formConfig.id,
    ...formDataWithoutDateAndNotes, // Do NOT include notes here!
    // CRITICAL: Pass poptavkaNotes if it exists in the hash
    ...(poptavkaNotes ? { notes: poptavkaNotes } : {})
  };
  
  const formDataWithNotes = {
    ...formDataWithoutDateAndNotes,
    notes: formNotes, // Add notes back to formData only
  };
  
  // Convert to OfferData
  const offerData = await convertFormDataToOfferData(
    formDataWithNotes,
    calc,
    formConfig,
    enhancedCustomerData
  );
  
  // Verify poptavkaNotes made it to OfferData
  if (poptavkaNote && offerData.poptavkaNotes !== poptavkaNote) {
    throw new Error(`FAIL: poptavkaNotes not passed correctly. Expected "${poptavkaNote}", got "${offerData.poptavkaNotes}"`);
  }
  if (!poptavkaNote && offerData.poptavkaNotes) {
    throw new Error(`FAIL: poptavkaNotes should be undefined but got "${offerData.poptavkaNotes}"`);
  }
  
  // Generate PDF HTML
  const html = renderOfferPdfBody(offerData, "http://localhost:3000");
  
  return { html, offerData };
}

async function run() {
  const LABEL_POPTAVKA = "Poznámka k poptávce:";
  const LABEL_ZAKAZNIK = "Poznámka zákazníka:";
  
  console.log("Testing full flow with hash encoding/decoding...\n");
  
  // Case 1: No note in form AND no note in /poptavka -> neither shown
  {
    console.log("Case 1: No notes anywhere");
    const { html } = await testFullFlow({});
    expectNotContains(html, LABEL_POPTAVKA, "Case 1: poptavka note should not be shown");
    expectNotContains(html, LABEL_ZAKAZNIK, "Case 1: form note should not be shown");
    console.log("✓ Passed\n");
  }
  
  // Case 2: Note in form ONLY -> shown under services table; not under address
  {
    console.log("Case 2: Form note only");
    const { html } = await testFullFlow({ formNote: "FORM_NOTE_TEST" });
    expectNotContains(html, LABEL_POPTAVKA, "Case 2: poptavka note should not be shown");
    expectContains(html, LABEL_ZAKAZNIK, "Case 2: form note label should be shown");
    expectContains(html, "FORM_NOTE_TEST", "Case 2: form note text should be present");
    console.log("✓ Passed\n");
  }
  
  // Case 3: Note in /poptavka ONLY -> shown under address; not under services table
  {
    console.log("Case 3: Poptavka note only -> should be in Section 1");
    const { html, offerData } = await testFullFlow({ poptavkaNote: "POPT_NOTE_TEST" });
    
    // Verify poptavkaNotes is in OfferData
    if (!offerData.poptavkaNotes || offerData.poptavkaNotes !== "POPT_NOTE_TEST") {
      throw new Error(`FAIL: Case 3: poptavkaNotes not in OfferData. Got: "${offerData.poptavkaNotes}"`);
    }
    
    expectContains(html, LABEL_POPTAVKA, "Case 3: poptavka note label should be shown");
    expectContains(html, "POPT_NOTE_TEST", "Case 3: poptavka note text should be present");
    expectNotContains(html, LABEL_ZAKAZNIK, "Case 3: form note should not be shown");
    
    // Verify it's in section 1 (after "1. Identifikace")
    const section1Index = html.indexOf("1. Identifikace");
    const noteIndex = html.indexOf(LABEL_POPTAVKA);
    if (noteIndex === -1 || noteIndex < section1Index) {
      throw new Error("Case 3: Poptavka note should be AFTER section 1 heading");
    }
    console.log("✓ Passed\n");
  }
  
  // Case 4: Both notes -> both shown in their correct places
  {
    console.log("Case 4: Both notes -> Form in Section 3, Poptavka in Section 1");
    const { html, offerData } = await testFullFlow({ formNote: "FORM_NOTE_TEST", poptavkaNote: "POPT_NOTE_TEST" });
    
    // Verify both notes are in OfferData
    if (!offerData.notes || offerData.notes !== "FORM_NOTE_TEST") {
      throw new Error(`FAIL: Case 4: form notes not in OfferData. Got: "${offerData.notes}"`);
    }
    if (!offerData.poptavkaNotes || offerData.poptavkaNotes !== "POPT_NOTE_TEST") {
      throw new Error(`FAIL: Case 4: poptavkaNotes not in OfferData. Got: "${offerData.poptavkaNotes}"`);
    }
    
    expectContains(html, LABEL_POPTAVKA, "Case 4: poptavka note label should be shown");
    expectContains(html, "POPT_NOTE_TEST", "Case 4: poptavka note text should be present");
    expectContains(html, LABEL_ZAKAZNIK, "Case 4: form note label should be shown");
    expectContains(html, "FORM_NOTE_TEST", "Case 4: form note text should be present");
    
    // Verify poptavka note is in section 1
    const section1Index = html.indexOf("1. Identifikace");
    const poptavkaIndex = html.indexOf(LABEL_POPTAVKA);
    if (poptavkaIndex === -1 || poptavkaIndex < section1Index) {
      throw new Error("Case 4: Poptavka note should be AFTER section 1 heading");
    }
    
    // Verify form note is in section 3
    const section3Index = html.indexOf("3. Shrnutí");
    const formNoteIndex = html.indexOf(LABEL_ZAKAZNIK);
    if (formNoteIndex === -1 || formNoteIndex < section3Index) {
      throw new Error("Case 4: Form note should be AFTER section 3 heading");
    }
    
    // Verify poptavka comes before form note
    if (poptavkaIndex > formNoteIndex) {
      throw new Error("Case 4: Poptavka note (section 1) should come before form note (section 3)");
    }
    
    console.log("✓ Passed\n");
  }
  
  console.log("All full flow tests passed!");
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

