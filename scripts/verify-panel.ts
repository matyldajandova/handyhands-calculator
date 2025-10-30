// Ensure PSČ resolution is skipped in tests to avoid network/URL issues
(globalThis as any).process = (globalThis as any).process || {};
(globalThis as any).process.env = (globalThis as any).process.env || {};
(globalThis as any).process.env.HH_SKIP_ZIP_RESOLVE = '1';
import { calculatePrice } from "@/utils/calculation";
import { panelBuildingFormConfig } from "@/config/forms/panel-building";

async function run() {
  const base = {
    cleaningFrequency: "weekly",
    aboveGroundFloors: 5,
    entranceCount: 3,
    apartmentsPerFloor: "3",
    hasElevator: "yes",
    generalCleaning: "no",
    windowsOnLandings: undefined,
    winterMaintenance: "no",
    zipCode: "14000"
  } as any;

  const noBasement = await calculatePrice({ ...base, basementCleaning: "no" }, panelBuildingFormConfig);
  const yesBasement = await calculatePrice({ ...base, basementCleaning: "yes" }, panelBuildingFormConfig);
  console.log("Panel basement NO:", noBasement.regularCleaningPrice);
  console.log("Panel basement YES:", yesBasement.regularCleaningPrice);

  if (!(yesBasement.regularCleaningPrice! > noBasement.regularCleaningPrice!)) {
    throw new Error("Panel: basementCleaning coefficient not applied (YES should be higher than NO)");
  }

  const withGen = await calculatePrice({ ...base, basementCleaning: "yes", generalCleaning: "yes", windowsOnLandings: "yes" }, panelBuildingFormConfig);
  console.log("Panel with general:", withGen.regularCleaningPrice, withGen.generalCleaningPrice);

  if (withGen.generalCleaningPrice !== undefined) {
    throw new Error("Panel: generalCleaningPrice must be undefined (amortized)");
  }
  if (!(withGen.regularCleaningPrice! > yesBasement.regularCleaningPrice!)) {
    throw new Error("Panel: monthly price should include general (be higher)");
  }
  console.log("Panel checks passed.");
}

run().catch((e) => { console.error(e); (globalThis as any).process?.exit(1); });
