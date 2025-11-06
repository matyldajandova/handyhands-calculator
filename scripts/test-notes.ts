/*
  Simple test runner for verifying correct separation of notes in Offer PDF.
  Run with: npx tsx scripts/test-notes.ts
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

function renderPdf({ formNote, poptavkaNote }: { formNote?: string; poptavkaNote?: string }) {
  const formConfig = createMockFormConfig();
  const calc = createMockCalculationResult();

  const formData: FormSubmissionData = formNote ? { notes: formNote, cleaningFrequency: "weekly" } : { cleaningFrequency: "weekly" };
  const customerData = {
    firstName: "Test",
    lastName: "User",
    email: "test@example.com",
    ...(poptavkaNote ? { notes: poptavkaNote } : {}),
  };

  const offer = convertFormDataToOfferData(formData, calc, formConfig, customerData);
  const html = renderOfferPdfBody(offer, "http://localhost:3000");
  return html;
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

async function run() {
  const LABEL_POPTAVKA = "Poznámka k poptávce:";
  const LABEL_ZAKAZNIK = "Poznámka zákazníka:";

  // Case 1: No note in form AND no note in /poptavka -> neither shown
  {
    const html = renderPdf({});
    expectNotContains(html, LABEL_POPTAVKA, "Case 1: poptavka note should not be shown");
    expectNotContains(html, LABEL_ZAKAZNIK, "Case 1: form note should not be shown");
  }

  // Case 2: Note in form ONLY -> shown under services table; not under address
  {
    const html = renderPdf({ formNote: "FORM_NOTE" });
    expectNotContains(html, LABEL_POPTAVKA, "Case 2: poptavka note should not be shown");
    expectContains(html, LABEL_ZAKAZNIK, "Case 2: form note label should be shown");
    expectContains(html, "FORM_NOTE", "Case 2: form note text should be present");
  }

  // Case 3: Note in /poptavka ONLY -> shown under address; not under services table
  {
    const html = renderPdf({ poptavkaNote: "POPT_NOTE" });
    expectContains(html, LABEL_POPTAVKA, "Case 3: poptavka note label should be shown");
    expectContains(html, "POPT_NOTE", "Case 3: poptavka note text should be present");
    expectNotContains(html, LABEL_ZAKAZNIK, "Case 3: form note should not be shown");
  }

  // Case 4: Both notes -> both shown in their correct places
  {
    const html = renderPdf({ formNote: "FORM_NOTE", poptavkaNote: "POPT_NOTE" });
    expectContains(html, LABEL_POPTAVKA, "Case 4: poptavka note label should be shown");
    expectContains(html, "POPT_NOTE", "Case 4: poptavka note text should be present");
    expectContains(html, LABEL_ZAKAZNIK, "Case 4: form note label should be shown");
    expectContains(html, "FORM_NOTE", "Case 4: form note text should be present");
  }

  console.log("All note mapping tests passed.");
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});


