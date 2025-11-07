/*
  Complete test: Form note in section 3, Poptavka note in section 1
  Run: npx tsx scripts/test-notes-complete.ts
*/

import { convertFormDataToOfferData } from "@/utils/form-to-offer-data";
import { renderOfferPdfBody } from "@/pdf/templates/OfferPDF";
import type { CalculationResult, FormConfig, FormSubmissionData } from "@/types/form-types";

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
  };
}

function expectContains(html: string, needle: string, message: string) {
  if (!html.includes(needle)) {
    throw new Error(`FAIL: ${message}\nExpected to find: ${needle}`);
  }
}

function expectNotContains(html: string, needle: string, message: string) {
  if (html.includes(needle)) {
    throw new Error(`FAIL: ${message}\nExpected NOT to find: ${needle}`);
  }
}

async function testPdfRendering(formNote?: string, poptavkaNote?: string) {
  const formConfig = createMockFormConfig();
  const calc = createMockCalculationResult();

  const formData: FormSubmissionData = formNote ? { notes: formNote, cleaningFrequency: "weekly" } : { cleaningFrequency: "weekly" };
  const customerData = {
    firstName: "Test",
    lastName: "User",
    email: "test@example.com",
    ...(poptavkaNote ? { notes: poptavkaNote } : {}),
  };

  const offer = await convertFormDataToOfferData(formData, calc, formConfig, customerData);
  const html = renderOfferPdfBody(offer, "http://localhost:3000");
  
  return { html, offer };
}

async function run() {
  const LABEL_POPTAVKA = "Poznámka k poptávce:";
  const LABEL_ZAKAZNIK = "Poznámka zákazníka:";
  
  console.log("Testing PDF note placement...\n");
  
  // Case 1: No notes
  {
    console.log("Case 1: No notes");
    const { html } = await testPdfRendering();
    expectNotContains(html, LABEL_POPTAVKA, "Poptavka note should not appear");
    expectNotContains(html, LABEL_ZAKAZNIK, "Form note should not appear");
    console.log("✓ Passed\n");
  }
  
  // Case 2: Form note only -> Section 3
  {
    console.log("Case 2: Form note only -> should be in Section 3");
    const { html } = await testPdfRendering("FORM_NOTE", undefined);
    expectNotContains(html, LABEL_POPTAVKA, "Poptavka note should not appear");
    expectContains(html, LABEL_ZAKAZNIK, "Form note label should appear");
    expectContains(html, "FORM_NOTE", "Form note text should appear");
    // Verify it's in section 3 (after "3. Shrnutí")
    const section3Index = html.indexOf("3. Shrnutí");
    const noteIndex = html.indexOf(LABEL_ZAKAZNIK);
    if (noteIndex === -1 || noteIndex < section3Index) {
      throw new Error("Form note should be AFTER section 3 heading");
    }
    console.log("✓ Passed\n");
  }
  
  // Case 3: Poptavka note only -> Section 1
  {
    console.log("Case 3: Poptavka note only -> should be in Section 1");
    const { html } = await testPdfRendering(undefined, "POPT_NOTE");
    expectContains(html, LABEL_POPTAVKA, "Poptavka note label should appear");
    expectContains(html, "POPT_NOTE", "Poptavka note text should appear");
    expectNotContains(html, LABEL_ZAKAZNIK, "Form note should not appear");
    // Verify it's in section 1 (after "1. Identifikace")
    const section1Index = html.indexOf("1. Identifikace");
    const noteIndex = html.indexOf(LABEL_POPTAVKA);
    if (noteIndex === -1 || noteIndex < section1Index) {
      throw new Error("Poptavka note should be AFTER section 1 heading");
    }
    console.log("✓ Passed\n");
  }
  
  // Case 4: Both notes -> Form in Section 3, Poptavka in Section 1
  {
    console.log("Case 4: Both notes -> Form in Section 3, Poptavka in Section 1");
    const { html } = await testPdfRendering("FORM_NOTE", "POPT_NOTE");
    expectContains(html, LABEL_POPTAVKA, "Poptavka note label should appear");
    expectContains(html, "POPT_NOTE", "Poptavka note text should appear");
    expectContains(html, LABEL_ZAKAZNIK, "Form note label should appear");
    expectContains(html, "FORM_NOTE", "Form note text should appear");
    
    // Verify poptavka note is in section 1
    const section1Index = html.indexOf("1. Identifikace");
    const poptavkaIndex = html.indexOf(LABEL_POPTAVKA);
    if (poptavkaIndex === -1 || poptavkaIndex < section1Index) {
      throw new Error("Poptavka note should be AFTER section 1 heading");
    }
    
    // Verify form note is in section 3
    const section3Index = html.indexOf("3. Shrnutí");
    const formNoteIndex = html.indexOf(LABEL_ZAKAZNIK);
    if (formNoteIndex === -1 || formNoteIndex < section3Index) {
      throw new Error("Form note should be AFTER section 3 heading");
    }
    
    // Verify poptavka comes before form note
    if (poptavkaIndex > formNoteIndex) {
      throw new Error("Poptavka note (section 1) should come before form note (section 3)");
    }
    
    console.log("✓ Passed\n");
  }
  
  console.log("All PDF placement tests passed!");
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

