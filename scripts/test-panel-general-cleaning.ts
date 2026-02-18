// Test script to verify panel building general cleaning calculation fix
// Tests the specific case reported: 8 floors, 5 entrances, Litvínov, with/without general cleaning

import { calculatePrice } from "@/utils/calculation";
import { panelBuildingFormConfig } from "@/config/forms/panel-building";
import { getAvailableRegions } from "@/utils/zip-code-mapping";

// Helper function to apply regional coefficient manually
// In production, this would be done automatically by getRegionFromZipCode
function applyRegionalCoefficient(price: number, zipCode: string): number {
  const regions = getAvailableRegions();
  if (zipCode === "43601") {
    // Litvínov is in Ústecký kraj
    const usteckyKraj = regions.find(r => r.value === "ustecky");
    if (usteckyKraj) {
      return price * usteckyKraj.coefficient;
    }
  }
  return price;
}

async function run() {
  console.log("=".repeat(60));
  console.log("Test: Panel building general cleaning calculation fix");
  console.log("Test s hodnotami klienta - Litvínov (43601)");
  console.log("=".repeat(60));
  console.log();

  // Manually set up region mapping for Litvínov (43601) - Ústecký kraj
  // This simulates what would happen in production
  const zipCode = "43601";
  const regions = getAvailableRegions();
  const usteckyKraj = regions.find(r => r.value === "ustecky");
  
  console.log(`PSČ ${zipCode} (Litvínov):`);
  if (usteckyKraj) {
    console.log(`  Region: ${usteckyKraj.label}`);
    console.log(`  Koeficient lokality: ${usteckyKraj.coefficient.toFixed(5)}`);
    console.log(`  (Poznámka: V produkci by se tento koeficient aplikoval automaticky)`);
  } else {
    console.log(`  Region: Ústecký kraj nenalezen`);
  }
  console.log();

  // Base form data matching user's scenario
  const baseFormData = {
    cleaningFrequency: "weekly", // 1x týdně
    aboveGroundFloors: 8, // 8 pater
    basementCleaning: "no", // úklid suterénu ne
    entranceCount: 5, // 5 vchodů
    apartmentsPerFloor: "3", // 3 byty na patře
    hasElevator: "yes", // výtah ano
    winterMaintenance: "no", // zimní údržba ne
    zipCode: zipCode // Litvínov
  } as any;

  console.log("Base parameters:");
  console.log(`  - Četnost: ${baseFormData.cleaningFrequency}`);
  console.log(`  - Počet pater: ${baseFormData.aboveGroundFloors}`);
  console.log(`  - Úklid suterénu: ${baseFormData.basementCleaning}`);
  console.log(`  - Počet vchodů: ${baseFormData.entranceCount}`);
  console.log(`  - Bytů na patře: ${baseFormData.apartmentsPerFloor}`);
  console.log(`  - Výtah: ${baseFormData.hasElevator}`);
  console.log(`  - Zimní údržba: ${baseFormData.winterMaintenance}`);
  console.log(`  - PSČ: ${baseFormData.zipCode}`);
  console.log();

  // Test 1: Without general cleaning (as reported by client: should be ~7570 Kč)
  console.log("Test 1: Bez generálního úklidu");
  console.log("  (Klient uvádí: 7570 Kč/měsíc)");
  const withoutGeneral = await calculatePrice(
    { ...baseFormData, generalCleaning: "no" },
    panelBuildingFormConfig
  );
  const priceWithoutGeneralRaw = withoutGeneral.regularCleaningPrice || 0;
  // Apply Ústecký kraj coefficient manually (0.69019)
  const priceWithoutGeneral = applyRegionalCoefficient(priceWithoutGeneralRaw, zipCode);
  console.log(`  Vypočítaná cena (bez koeficientu lokality): ${priceWithoutGeneralRaw.toFixed(1)} Kč/měsíc`);
  console.log(`  Vypočítaná cena (s koeficientem Ústeckého kraje): ${priceWithoutGeneral.toFixed(1)} Kč/měsíc`);
  const diffWithout = Math.abs(priceWithoutGeneral - 7570);
  if (diffWithout < 100) {
    console.log(`  ✓ Cena odpovídá hodnotě od klienta (rozdíl: ${diffWithout.toFixed(1)} Kč)`);
  } else {
    console.log(`  ⚠ Cena se liší od hodnoty od klienta (rozdíl: ${diffWithout.toFixed(1)} Kč)`);
    console.log(`  (Možné důvody: jiný rok výpočtu, změna základní ceny, nebo jiné parametry)`);
  }
  console.log();

  // Test 2: With general cleaning, windowsOnLandings = yes
  console.log("Test 2: S generálním úklidem, okna na podestách = ano");
  const withGeneralYes = await calculatePrice(
    { ...baseFormData, generalCleaning: "yes", windowsOnLandings: "yes" },
    panelBuildingFormConfig
  );
  const priceWithGeneralYesRaw = withGeneralYes.regularCleaningPrice || 0;
  const priceWithGeneralYes = applyRegionalCoefficient(priceWithGeneralYesRaw, zipCode);
  console.log(`  Vypočítaná cena (s koeficientem Ústeckého kraje): ${priceWithGeneralYes.toFixed(1)} Kč/měsíc`);
  console.log();

  // Test 3: With general cleaning, windowsOnLandings = no (as reported by client: should be ~4690 Kč)
  console.log("Test 3: S generálním úklidem, okna na podestách = ne");
  console.log("  (Klient uvádí: 4690 Kč/měsíc - TOTO BYLO ŠPATNĚ, mělo být vyšší než bez generálního úklidu)");
  const withGeneralNo = await calculatePrice(
    { ...baseFormData, generalCleaning: "yes", windowsOnLandings: "no" },
    panelBuildingFormConfig
  );
  const priceWithGeneralNoRaw = withGeneralNo.regularCleaningPrice || 0;
  const priceWithGeneralNo = applyRegionalCoefficient(priceWithGeneralNoRaw, zipCode);
  console.log(`  Vypočítaná cena (s koeficientem Ústeckého kraje): ${priceWithGeneralNo.toFixed(1)} Kč/měsíc`);
  console.log();

  // Verification
  console.log("=".repeat(60));
  console.log("Výsledky ověření:");
  console.log("=".repeat(60));

  let allTestsPassed = true;

  // Check 1: Price with general cleaning (yes) should be higher than without
  if (priceWithGeneralYes > priceWithoutGeneral) {
    console.log("✓ Test 1 PASSED: Cena s generálním úklidem (okna=ano) je vyšší než bez generálního úklidu");
    console.log(`  Rozdíl: +${(priceWithGeneralYes - priceWithoutGeneral).toFixed(1)} Kč`);
  } else {
    console.log("✗ Test 1 FAILED: Cena s generálním úklidem (okna=ano) NENÍ vyšší než bez generálního úklidu");
    console.log(`  Rozdíl: ${(priceWithGeneralYes - priceWithoutGeneral).toFixed(1)} Kč`);
    allTestsPassed = false;
  }
  console.log();

  // Check 2: Price with general cleaning (no windows) should be higher than without
  if (priceWithGeneralNo > priceWithoutGeneral) {
    console.log("✓ Test 2 PASSED: Cena s generálním úklidem (okna=ne) je vyšší než bez generálního úklidu");
    console.log(`  Rozdíl: +${(priceWithGeneralNo - priceWithoutGeneral).toFixed(1)} Kč`);
  } else {
    console.log("✗ Test 2 FAILED: Cena s generálním úklidem (okna=ne) NENÍ vyšší než bez generálního úklidu");
    console.log(`  Rozdíl: ${(priceWithGeneralNo - priceWithoutGeneral).toFixed(1)} Kč`);
    allTestsPassed = false;
  }
  console.log();

  // Check 3: Price with general cleaning (yes windows) should be higher than with general cleaning (no windows)
  if (priceWithGeneralYes > priceWithGeneralNo) {
    console.log("✓ Test 3 PASSED: Cena s generálním úklidem (okna=ano) je vyšší než s generálním úklidem (okna=ne)");
    console.log(`  Rozdíl: +${(priceWithGeneralYes - priceWithGeneralNo).toFixed(1)} Kč`);
  } else {
    console.log("✗ Test 3 FAILED: Cena s generálním úklidem (okna=ano) NENÍ vyšší než s generálním úklidem (okna=ne)");
    console.log(`  Rozdíl: ${(priceWithGeneralYes - priceWithGeneralNo).toFixed(1)} Kč`);
    allTestsPassed = false;
  }
  console.log();

  // Summary
  console.log("=".repeat(60));
  console.log("SHRNUTÍ:");
  console.log("=".repeat(60));
  console.log(`Bez generálního úklidu:     ${priceWithoutGeneral.toFixed(1)} Kč/měsíc`);
  console.log(`S generálním úklidem (okna=ano): ${priceWithGeneralYes.toFixed(1)} Kč/měsíc (+${(priceWithGeneralYes - priceWithoutGeneral).toFixed(1)} Kč)`);
  console.log(`S generálním úklidem (okna=ne):  ${priceWithGeneralNo.toFixed(1)} Kč/měsíc (+${(priceWithGeneralNo - priceWithoutGeneral).toFixed(1)} Kč)`);
  console.log();
  if (allTestsPassed) {
    console.log("✓ VŠECHNY TESTY PROŠLY - Oprava funguje správně!");
    console.log("✓ Cena s generálním úklidem je VŽDY vyšší než bez generálního úklidu");
  } else {
    console.log("✗ NĚKTERÉ TESTY SELHALY - Je potřeba další oprava");
  }
  console.log("=".repeat(60));

  // Show applied coefficients for debugging
  console.log();
  console.log("Detailní informace o koeficientech (bez generálního úklidu):");
  withoutGeneral.calculationDetails?.appliedCoefficients?.forEach(coeff => {
    console.log(`  - ${coeff.label}: ${coeff.coefficient.toFixed(4)} (vliv: ${coeff.impact > 0 ? '+' : ''}${coeff.impact.toFixed(2)}%)`);
  });
  console.log(`  Finální koeficient: ${withoutGeneral.calculationDetails?.finalCoefficient.toFixed(4)}`);
  console.log();

  console.log("Detailní informace o koeficientech (s generálním úklidem, okna=ne):");
  withGeneralNo.calculationDetails?.appliedCoefficients?.forEach(coeff => {
    console.log(`  - ${coeff.label}: ${coeff.coefficient.toFixed(4)} (vliv: ${coeff.impact > 0 ? '+' : ''}${coeff.impact.toFixed(2)}%)`);
  });
  console.log(`  Finální koeficient: ${withGeneralNo.calculationDetails?.finalCoefficient.toFixed(4)}`);

  if (!allTestsPassed) {
    throw new Error("Some tests failed");
  }
}

run().catch((e) => {
  console.error(e);
  (globalThis as any).process?.exit(1);
});
