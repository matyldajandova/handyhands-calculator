// Ensure PSČ resolution is skipped in tests to avoid network/URL issues
(globalThis as any).process = (globalThis as any).process || {};
(globalThis as any).process.env = (globalThis as any).process.env || {};
(globalThis as any).process.env.HH_SKIP_ZIP_RESOLVE = '1';
import { calculatePrice } from "@/utils/calculation";
import { residentialBuildingFormConfig } from "@/config/forms/residential-building";

function roundToTenth(n: number): number { return Math.round(n * 10) / 10; }

async function run() {
  const baseForm = {
    cleaningFrequency: "weekly",
    aboveGroundFloors: 5,
    undergroundFloors: 1,
    apartmentsPerFloor: "3",
    hasElevator: "yes",
    hasHotWater: "no",
    buildingPeriod: "pre1945",
    generalCleaning: "no",
    winterMaintenance: "no",
    zipCode: "14000"
  } as any;

  // 1) Regular only
  const res1 = await calculatePrice(baseForm, residentialBuildingFormConfig);
  console.log("Regular only:", res1.regularCleaningPrice, "Kč/měsíc");

  // 2) General yes, basement in general (regular should get 0.95x)
  const form2 = {
    ...baseForm,
    generalCleaning: "yes",
    generalCleaningType: "standard",
    windowsPerFloor: 2,
    floorsWithWindows: "all",
    windowType: ["original"],
    basementCleaning: "general",
    basementCleaningDetails: "corridors-and-rooms"
  };
  const res2 = await calculatePrice(form2, residentialBuildingFormConfig);
  const expectedRegular2 = roundToTenth((res1.regularCleaningPrice || 0) * 0.95);
  console.log("With general (basement in general):", res2.regularCleaningPrice, "Kč/měsíc", "| expected:", expectedRegular2);
  if (Math.abs(res2.regularCleaningPrice - expectedRegular2) > 0.2) {
    throw new Error(`Mismatch: regular with basement in general should be ~${expectedRegular2}, got ${res2.regularCleaningPrice}`);
  }

  // 3) General yes, basement in regular (regular stays base; general gets 0.95x)
  const form3 = {
    ...baseForm,
    generalCleaning: "yes",
    generalCleaningType: "standard",
    windowsPerFloor: 2,
    floorsWithWindows: "all",
    windowType: ["original"],
    basementCleaning: "regular",
    basementCleaningDetails: "corridors-and-rooms"
  };
  const res3 = await calculatePrice(form3, residentialBuildingFormConfig);
  console.log("With general (basement in regular):", res3.regularCleaningPrice, "Kč/měsíc", "| expected base:", res1.regularCleaningPrice);
  if (res3.regularCleaningPrice !== res1.regularCleaningPrice) {
    throw new Error(`Mismatch: regular with basement in regular should equal base ${res1.regularCleaningPrice}, got ${res3.regularCleaningPrice}`);
  }

  console.log("General prices:", { withBasementInGeneral: res2.generalCleaningPrice, withBasementInRegular: res3.generalCleaningPrice });
  if (res2.generalCleaningPrice === undefined || res3.generalCleaningPrice === undefined) {
    throw new Error("General cleaning price missing in scenarios 2/3");
  }
  const expectedGeneral3 = roundToTenth(res2.generalCleaningPrice * 0.95); // same inputs except basement coeff 0.95
  // Note: slight differences can occur if window/building coefficients differ; here they are identical.
  console.log("Expected general (basement in regular):", expectedGeneral3);

  // Allow small rounding tolerance (0.1 Kč steps)
  if (Math.abs(res3.generalCleaningPrice - expectedGeneral3) > 0.1) {
    throw new Error(`Mismatch: general with basement in regular should be ~${expectedGeneral3}, got ${res3.generalCleaningPrice}`);
  }

  // 4) No basement: selecting general must NOT change regular price
  const nobase_base = {
    cleaningFrequency: "weekly",
    aboveGroundFloors: 4,
    undergroundFloors: 0,
    apartmentsPerFloor: "3",
    hasElevator: "no",
    hasHotWater: "yes",
    buildingPeriod: "pre1945",
    generalCleaning: "no",
    winterMaintenance: "no",
    zipCode: "14000"
  } as any;
  const nobase_res_regular = await calculatePrice(nobase_base, residentialBuildingFormConfig);
  const nobase_with_general = await calculatePrice({
    ...nobase_base,
    generalCleaning: "yes",
    generalCleaningType: "standard",
    windowsPerFloor: 2,
    floorsWithWindows: "all",
    windowType: ["original"]
  }, residentialBuildingFormConfig);
  console.log("No-basement regular:", nobase_res_regular.regularCleaningPrice, "| With general regular:", nobase_with_general.regularCleaningPrice, "general:", nobase_with_general.generalCleaningPrice);
  if (nobase_res_regular.regularCleaningPrice !== nobase_with_general.regularCleaningPrice) {
    throw new Error(`No-basement: regular must be unchanged when general is selected. Expected ${nobase_res_regular.regularCleaningPrice}, got ${nobase_with_general.regularCleaningPrice}`);
  }

  // 5) With undergroundFloors=2: verify exact 0.95 split logic
  const twoBase = {
    cleaningFrequency: "weekly",
    aboveGroundFloors: 5,
    undergroundFloors: 2,
    apartmentsPerFloor: "3",
    hasElevator: "yes",
    hasHotWater: "no",
    buildingPeriod: "pre1945",
    generalCleaning: "no",
    winterMaintenance: "no",
    zipCode: "14000"
  } as any;
  const two_regular = await calculatePrice(twoBase, residentialBuildingFormConfig);
  const two_gen_in_general = await calculatePrice({
    ...twoBase,
    generalCleaning: "yes",
    generalCleaningType: "standard",
    windowsPerFloor: 2,
    floorsWithWindows: "all",
    windowType: ["original"],
    basementCleaning: "general",
    basementCleaningDetails: "corridors-and-rooms"
  }, residentialBuildingFormConfig);
  const two_gen_in_regular = await calculatePrice({
    ...twoBase,
    generalCleaning: "yes",
    generalCleaningType: "standard",
    windowsPerFloor: 2,
    floorsWithWindows: "all",
    windowType: ["original"],
    basementCleaning: "regular",
    basementCleaningDetails: "corridors-and-rooms"
  }, residentialBuildingFormConfig);
  const exp_two_reg_with_general = roundToTenth(two_regular.regularCleaningPrice! * 0.95);
  if (Math.abs(two_gen_in_general.regularCleaningPrice! - exp_two_reg_with_general) > 0.2) {
    throw new Error(`UF=2: expected regular with basement in general to be ~${exp_two_reg_with_general}, got ${two_gen_in_general.regularCleaningPrice}`);
  }
  if (two_gen_in_regular.regularCleaningPrice !== two_regular.regularCleaningPrice) {
    throw new Error(`UF=2: expected regular with basement in regular to equal base ${two_regular.regularCleaningPrice}, got ${two_gen_in_regular.regularCleaningPrice}`);
  }
  const exp_two_general_in_regular = roundToTenth((two_gen_in_general.generalCleaningPrice || 0) * 0.95);
  if (Math.abs((two_gen_in_regular.generalCleaningPrice || 0) - exp_two_general_in_regular) > 0.1) {
    throw new Error(`UF=2: expected general with basement in regular ~${exp_two_general_in_regular}, got ${two_gen_in_regular.generalCleaningPrice}`);
  }

  console.log("All residential-building checks passed.");
}

run().catch((e) => {
  console.error(e);
  (globalThis as any).process?.exit(1);
});
