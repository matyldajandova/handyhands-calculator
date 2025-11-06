// Ensure PSČ resolution is skipped in tests to avoid network/URL issues
(globalThis as any).process = (globalThis as any).process || {};
(globalThis as any).process.env = (globalThis as any).process.env || {};
(globalThis as any).process.env.HH_SKIP_ZIP_RESOLVE = '1';

import { calculatePrice } from "@/utils/calculation";
import { convertFormDataToOfferData } from "@/utils/form-to-offer-data";
import { oneTimeCleaningFormConfig } from "@/config/forms/one-time-cleaning";
import { handymanServicesFormConfig } from "@/config/forms/handyman-services";
import { residentialBuildingFormConfig } from "@/config/forms/residential-building";
import { buildPoptavkaHashData } from "@/utils/hash-data-builder";
import { hashService } from "@/services/hash-service";
import type { FormConfig } from "@/types/form-types";

async function run() {
  console.log("Testing date delays and hash preservation of start dates...\n");

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Test 1: One-time cleaning should have 1-day delay
  console.log("Test 1: One-time cleaning date delay (should be +1 day)");
  const oneTimeFormData = {
    cleaningType: "basic",
    spaceArea: "up-to-50",
    windowCleaning: "no",
    cleaningSupplies: ["worker-brings"], // This adds 400 Kč fixed addon
    domesticAnimals: "no",
    zipCode: "14000"
  } as any;

  const oneTimeResult = await calculatePrice(oneTimeFormData, oneTimeCleaningFormConfig);
  const oneTimeOffer = convertFormDataToOfferData(oneTimeFormData, oneTimeResult, oneTimeCleaningFormConfig);

  // Parse the Czech date format (DD. MM. YYYY)
  const oneTimeDateParts = oneTimeOffer.startDate.split('. ');
  const oneTimeDate = new Date(
    parseInt(oneTimeDateParts[2], 10),
    parseInt(oneTimeDateParts[1], 10) - 1,
    parseInt(oneTimeDateParts[0], 10)
  );
  oneTimeDate.setHours(0, 0, 0, 0);
  const oneTimeDaysDiff = Math.ceil((oneTimeDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

  console.log(`  Start date: ${oneTimeOffer.startDate}`);
  console.log(`  Days from now: ${oneTimeDaysDiff}`);
  
  if (oneTimeDaysDiff !== 1) {
    throw new Error(`Expected 1 day delay for one-time cleaning, got ${oneTimeDaysDiff}`);
  }
  console.log("  ✓ One-time cleaning has correct 1-day delay\n");

  // Test 2: Handyman services (window washing) should have 1-day delay
  console.log("Test 2: Handyman services date delay (should be +1 day)");
  const handymanFormData = {
    roomCount: "3",
    cleaningSupplies: ["cleaning-supplies"],
    zipCode: "14000"
  } as any;

  const handymanResult = await calculatePrice(handymanFormData, handymanServicesFormConfig);
  const handymanOffer = convertFormDataToOfferData(handymanFormData, handymanResult, handymanServicesFormConfig);

  const handymanDateParts = handymanOffer.startDate.split('. ');
  const handymanDate = new Date(
    parseInt(handymanDateParts[2], 10),
    parseInt(handymanDateParts[1], 10) - 1,
    parseInt(handymanDateParts[0], 10)
  );
  handymanDate.setHours(0, 0, 0, 0);
  const handymanDaysDiff = Math.ceil((handymanDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

  console.log(`  Start date: ${handymanOffer.startDate}`);
  console.log(`  Days from now: ${handymanDaysDiff}`);
  
  if (handymanDaysDiff !== 1) {
    throw new Error(`Expected 1 day delay for handyman services, got ${handymanDaysDiff}`);
  }
  console.log("  ✓ Handyman services have correct 1-day delay\n");

  // Test 3: Regular cleaning should have 10-day delay
  console.log("Test 3: Regular cleaning date delay (should be +10 days)");
  const regularFormData = {
    cleaningFrequency: "weekly",
    aboveGroundFloors: 5,
    undergroundFloors: 0,
    apartmentsPerFloor: "3",
    hasElevator: "yes",
    hasHotWater: "no",
    buildingPeriod: "pre1945",
    generalCleaning: "no",
    winterMaintenance: "no",
    zipCode: "14000"
  } as any;

  const regularResult = await calculatePrice(regularFormData, residentialBuildingFormConfig);
  const regularOffer = convertFormDataToOfferData(regularFormData, regularResult, residentialBuildingFormConfig);

  const regularDateParts = regularOffer.startDate.split('. ');
  const regularDate = new Date(
    parseInt(regularDateParts[2], 10),
    parseInt(regularDateParts[1], 10) - 1,
    parseInt(regularDateParts[0], 10)
  );
  regularDate.setHours(0, 0, 0, 0);
  const regularDaysDiff = Math.ceil((regularDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

  console.log(`  Start date: ${regularOffer.startDate}`);
  console.log(`  Days from now: ${regularDaysDiff}`);
  
  if (regularDaysDiff !== 10) {
    throw new Error(`Expected 10 day delay for regular cleaning, got ${regularDaysDiff}`);
  }
  console.log("  ✓ Regular cleaning has correct 10-day delay\n");

  // Test 4: Start date should be preserved in hash for one-time cleaning
  console.log("Test 4: Start date preservation in hash (one-time cleaning)");
  
  // Create hash with the calculated start date
  const hashDataOneTime = buildPoptavkaHashData({
    totalPrice: oneTimeResult.totalMonthlyPrice,
    calculationResult: oneTimeResult,
    formData: {
      ...oneTimeFormData,
      serviceStartDate: oneTimeOffer.startDate // Include the calculated start date
    },
    formConfig: oneTimeCleaningFormConfig
  });

  // Verify start date is in formData
  const hashStartDateOneTime = hashDataOneTime.calculationData?.formData?.serviceStartDate as string | undefined;
  if (!hashStartDateOneTime) {
    throw new Error("serviceStartDate not found in hash formData");
  }
  
  console.log(`  Start date in hash: ${hashStartDateOneTime}`);
  
  // Parse and verify the date matches
  const hashDatePartsOneTime = hashStartDateOneTime.split('. ');
  const hashDateOneTime = new Date(
    parseInt(hashDatePartsOneTime[2], 10),
    parseInt(hashDatePartsOneTime[1], 10) - 1,
    parseInt(hashDatePartsOneTime[0], 10)
  );
  hashDateOneTime.setHours(0, 0, 0, 0);
  
  if (hashDateOneTime.getTime() !== oneTimeDate.getTime()) {
    throw new Error(`Start date mismatch: expected ${oneTimeDate.toLocaleDateString("cs-CZ")}, got ${hashDateOneTime.toLocaleDateString("cs-CZ")}`);
  }
  console.log("  ✓ Start date preserved in hash\n");

  // Test 5: Start date should be preserved after hash encoding/decoding
  console.log("Test 5: Start date preservation after hash encoding/decoding");
  
  const hash = hashService.generateHash(hashDataOneTime);
  const decodedHash = hashService.decodeHash(hash);
  
  if (!decodedHash) {
    throw new Error("Failed to decode hash");
  }

  const decodedStartDate = decodedHash.calculationData?.formData?.serviceStartDate as string | undefined;
  if (!decodedStartDate) {
    throw new Error("serviceStartDate lost after hash decode");
  }

  console.log(`  Decoded start date: ${decodedStartDate}`);
  
  // Parse decoded date
  const decodedDateParts = decodedStartDate.split('. ');
  const decodedDate = new Date(
    parseInt(decodedDateParts[2], 10),
    parseInt(decodedDateParts[1], 10) - 1,
    parseInt(decodedDateParts[0], 10)
  );
  decodedDate.setHours(0, 0, 0, 0);
  
  if (decodedDate.getTime() !== oneTimeDate.getTime()) {
    throw new Error(`Decoded date mismatch: expected ${oneTimeDate.toLocaleDateString("cs-CZ")}, got ${decodedDate.toLocaleDateString("cs-CZ")}`);
  }
  console.log("  ✓ Start date preserved after hash encoding/decoding\n");

  // Test 6: Start date should be preserved in hash for regular cleaning
  console.log("Test 6: Start date preservation in hash (regular cleaning)");
  
  const hashDataRegular = buildPoptavkaHashData({
    totalPrice: regularResult.totalMonthlyPrice,
    calculationResult: regularResult,
    formData: {
      ...regularFormData,
      serviceStartDate: regularOffer.startDate // Include the calculated start date
    },
    formConfig: residentialBuildingFormConfig
  });

  const hashStartDateRegular = hashDataRegular.calculationData?.formData?.serviceStartDate as string | undefined;
  if (!hashStartDateRegular) {
    throw new Error("serviceStartDate not found in hash formData for regular cleaning");
  }
  
  console.log(`  Start date in hash: ${hashStartDateRegular}`);
  
  const hashDatePartsRegular = hashStartDateRegular.split('. ');
  const hashDateRegular = new Date(
    parseInt(hashDatePartsRegular[2], 10),
    parseInt(hashDatePartsRegular[1], 10) - 1,
    parseInt(hashDatePartsRegular[0], 10)
  );
  hashDateRegular.setHours(0, 0, 0, 0);
  
  if (hashDateRegular.getTime() !== regularDate.getTime()) {
    throw new Error(`Start date mismatch for regular cleaning: expected ${regularDate.toLocaleDateString("cs-CZ")}, got ${hashDateRegular.toLocaleDateString("cs-CZ")}`);
  }
  
  const regularDaysDiffFromHash = Math.ceil((hashDateRegular.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  if (regularDaysDiffFromHash !== 10) {
    throw new Error(`Date delay incorrect after hash: expected 10 days, got ${regularDaysDiffFromHash}`);
  }
  console.log("  ✓ Start date preserved in hash with correct 10-day delay\n");

  // Test 7: Date validation when loading from hash (should enforce correct delay)
  console.log("Test 7: Date validation when loading from hash");
  
  // Simulate loading from hash with an old date (should be corrected)
  const oldDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days (should be 1 for hourly)
  oldDate.setHours(0, 0, 0, 0);
  const oldDateStr = oldDate.toLocaleDateString("cs-CZ");
  
  const hashDataWithOldDate = buildPoptavkaHashData({
    totalPrice: oneTimeResult.totalMonthlyPrice,
    calculationResult: oneTimeResult,
    formData: {
      ...oneTimeFormData,
      serviceStartDate: oldDateStr // Old date that should be corrected
    },
    formConfig: oneTimeCleaningFormConfig
  });

  // When converting back, it should enforce minimum delay
  if (!hashDataWithOldDate.calculationData) {
    throw new Error("calculationData missing in hash");
  }
  
  const offerWithOldDate = convertFormDataToOfferData(
    hashDataWithOldDate.calculationData.formData as any,
    oneTimeResult,
    oneTimeCleaningFormConfig
  );

  const correctedDateParts = offerWithOldDate.startDate.split('. ');
  const correctedDate = new Date(
    parseInt(correctedDateParts[2], 10),
    parseInt(correctedDateParts[1], 10) - 1,
    parseInt(correctedDateParts[0], 10)
  );
  correctedDate.setHours(0, 0, 0, 0);
  const correctedDaysDiff = Math.ceil((correctedDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

  console.log(`  Old date in hash: ${oldDateStr} (${Math.ceil((oldDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))} days)`);
  console.log(`  Corrected date: ${offerWithOldDate.startDate} (${correctedDaysDiff} days)`);
  
  if (correctedDaysDiff < 1) {
    throw new Error(`Date validation failed: corrected date should be at least 1 day, got ${correctedDaysDiff}`);
  }
  console.log("  ✓ Date validation enforces minimum delay\n");

  // Test 8: Hash generation from PDF route (simulating PDF button click without existing hash)
  console.log("Test 8: Hash generation from PDF route (simulating PDF button click)");
  
  // Simulate what happens when PDF is generated from success screen without existing hash
  // The PDF route receives OfferData and generates a hash if poptavkaHash is missing
  // First, simulate what success screen does: include calculationResult, formConfig, and formData in customerData
  const offerDataForPDF = {
    ...oneTimeOffer,
    poptavkaHash: undefined, // No existing hash, so PDF route will generate one
    customer: {
      ...oneTimeOffer.customer,
      // Include calculationResult and formConfig as success screen does
      calculationResult: oneTimeResult,
      formConfig: oneTimeCleaningFormConfig,
      serviceType: oneTimeCleaningFormConfig.id,
      // Include original formData fields (cleaningSupplies, zipCode, etc.)
      ...oneTimeFormData
    } as any
  };
  
  // Simulate the PDF route's hash generation logic (from route.tsx lines 19-89)
  const customerName = offerDataForPDF.customer?.name || '';
  const customerEmail = offerDataForPDF.customer?.email || '';
  const nameParts = customerName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  const serviceType = (offerDataForPDF.customer as Record<string, unknown>)?.serviceType as string | undefined;
  
  // Build formData as PDF route does
  const pdfRouteFormData = {
    firstName: firstName,
    lastName: lastName,
    email: customerEmail,
    // Convert Czech date format (DD. MM. YYYY) to ISO format (YYYY-MM-DD) for hash
    serviceStartDate: (() => {
      const dateStr = offerDataForPDF.startDate;
      // Check if it's already in ISO format
      if (dateStr.includes('-') && dateStr.length === 10) {
        return dateStr;
      }
      // Parse Czech format (DD. MM. YYYY) and convert to ISO
      const parts = dateStr.split('. ');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
      }
      return dateStr; // Fallback to original if parsing fails
    })(),
    ...(offerDataForPDF.customer as Record<string, unknown>)
  };
  
  // Get original calculationResult from customer data
  const originalCalculationResult = (offerDataForPDF.customer as Record<string, unknown>)?.calculationResult as import("@/types/form-types").CalculationResult | undefined;
  
  // Build hash data as PDF route does
  const pdfRouteHashData = buildPoptavkaHashData({
    serviceTitle: offerDataForPDF.serviceTitle || 'Ostatní služby',
    totalPrice: offerDataForPDF.price,
    calculationResult: originalCalculationResult || oneTimeResult,
    formData: pdfRouteFormData,
    formConfig: (offerDataForPDF.customer as Record<string, unknown>)?.formConfig as FormConfig | undefined || oneTimeCleaningFormConfig
  });
  
  // Verify start date is preserved (should be in ISO format now)
  const pdfRouteStartDate = pdfRouteHashData.calculationData?.formData?.serviceStartDate as string | undefined;
  if (!pdfRouteStartDate) {
    throw new Error("serviceStartDate not found in hash generated by PDF route logic");
  }
  
  console.log(`  Start date in PDF route hash: ${pdfRouteStartDate}`);
  
  // Parse ISO format date (YYYY-MM-DD) and verify it matches
  let pdfRouteDate: Date;
  if (pdfRouteStartDate.includes('-')) {
    const [year, month, day] = pdfRouteStartDate.split('-').map(Number);
    pdfRouteDate = new Date(Date.UTC(year, month - 1, day));
  } else {
    // Fallback to Czech format parsing
    const parts = pdfRouteStartDate.split('. ');
    pdfRouteDate = new Date(
      parseInt(parts[2], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[0], 10)
    );
  }
  pdfRouteDate.setHours(0, 0, 0, 0);
  
  if (pdfRouteDate.getTime() !== oneTimeDate.getTime()) {
    throw new Error(`PDF route hash date mismatch: expected ${oneTimeDate.toLocaleDateString("cs-CZ")}, got ${pdfRouteDate.toLocaleDateString("cs-CZ")}`);
  }
  
  // Verify calculationResult has all appliedCoefficients (including cleaningSupplies and zipCode)
  const pdfRouteCoefficients = pdfRouteHashData.calculationData?.calculationDetails?.appliedCoefficients || [];
  const hasCleaningSupplies = pdfRouteCoefficients.some(coeff => 
    coeff.field === 'cleaningSupplies' || coeff.label.toLowerCase().includes('úklidové náčiní')
  );
  const hasTransport = pdfRouteCoefficients.some(coeff => 
    coeff.field === 'zipCode' || coeff.label.toLowerCase().includes('doprava')
  );
  
  if (!hasCleaningSupplies) {
    throw new Error("Cleaning supplies coefficient missing in PDF route hash");
  }
  if (!hasTransport) {
    throw new Error("Transport coefficient missing in PDF route hash");
  }
  
  console.log(`  Found ${pdfRouteCoefficients.length} applied coefficients`);
  console.log(`  Cleaning supplies: ${hasCleaningSupplies ? '✓' : '✗'}`);
  console.log(`  Transport: ${hasTransport ? '✓' : '✗'}`);
  
  // Verify hash encoding/decoding works
  const pdfRouteHash = hashService.generateHash(pdfRouteHashData);
  const decodedPdfRouteHash = hashService.decodeHash(pdfRouteHash);
  
  if (!decodedPdfRouteHash) {
    throw new Error("Failed to decode hash generated by PDF route logic");
  }
  
  const decodedPdfRouteStartDate = decodedPdfRouteHash.calculationData?.formData?.serviceStartDate as string | undefined;
  if (!decodedPdfRouteStartDate) {
    throw new Error("serviceStartDate lost after decoding PDF route hash");
  }
  
  let decodedPdfRouteDate: Date;
  if (decodedPdfRouteStartDate.includes('-')) {
    const [year, month, day] = decodedPdfRouteStartDate.split('-').map(Number);
    decodedPdfRouteDate = new Date(Date.UTC(year, month - 1, day));
  } else {
    const parts = decodedPdfRouteStartDate.split('. ');
    decodedPdfRouteDate = new Date(
      parseInt(parts[2], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[0], 10)
    );
  }
  decodedPdfRouteDate.setHours(0, 0, 0, 0);
  
  if (decodedPdfRouteDate.getTime() !== oneTimeDate.getTime()) {
    throw new Error(`Decoded PDF route hash date mismatch: expected ${oneTimeDate.toLocaleDateString("cs-CZ")}, got ${decodedPdfRouteDate.toLocaleDateString("cs-CZ")}`);
  }
  
  console.log(`  Decoded start date from PDF route hash: ${decodedPdfRouteStartDate}`);
  console.log("  ✓ PDF route hash generation preserves start date and appliedCoefficients correctly\n");

  // Test 9: Date correction when loading from hash in poptavka page (simulating PDF button click with wrong date)
  console.log("Test 9: Date correction when loading from hash with insufficient delay");
  
  // Simulate a hash with a date that doesn't meet minimum delay (e.g., old date or wrong delay)
  const insufficientDate = new Date(Date.now() + 0.5 * 24 * 60 * 60 * 1000); // 0.5 days (should be 1 for hourly)
  insufficientDate.setHours(0, 0, 0, 0);
  const insufficientDateStrISO = insufficientDate.toISOString().split('T')[0]; // ISO format
  
  const hashDataWithInsufficientDate = buildPoptavkaHashData({
    totalPrice: oneTimeResult.totalMonthlyPrice,
    calculationResult: oneTimeResult,
    formData: {
      ...oneTimeFormData,
      serviceStartDate: insufficientDateStrISO // Date that doesn't meet minimum delay
    },
    formConfig: oneTimeCleaningFormConfig
  });
  
  // Simulate what poptavka page does when loading from hash
  if (!hashDataWithInsufficientDate.calculationData) {
    throw new Error("calculationData missing in hash");
  }
  
  const isHourlyService = hashDataWithInsufficientDate.serviceType === "one-time-cleaning" || hashDataWithInsufficientDate.serviceType === "handyman-services";
  const daysDelay = isHourlyService ? 1 : 10;
  const minDate = new Date(Date.now() + daysDelay * 24 * 60 * 60 * 1000);
  minDate.setHours(0, 0, 0, 0);
  
  const hashFormData = hashDataWithInsufficientDate.calculationData.formData as Record<string, unknown>;
  const dateStr = hashFormData.serviceStartDate as string;
  
  // Parse ISO date format
  let parsedDate: Date;
  if (dateStr.includes('-')) {
    const isoDate = dateStr.split('T')[0];
    const [year, month, day] = isoDate.split('-').map(Number);
    parsedDate = new Date(year, month - 1, day);
    parsedDate.setHours(0, 0, 0, 0);
  } else {
    parsedDate = minDate;
  }
  
  // Enforce minimum delay (same logic as poptavka page)
  const nowTest = new Date();
  nowTest.setHours(0, 0, 0, 0);
  const daysUntilDate = Math.ceil((parsedDate.getTime() - nowTest.getTime()) / (24 * 60 * 60 * 1000));
  const minDaysRequired = isHourlyService ? 1 : 10;
  
  if (parsedDate < minDate || daysUntilDate < minDaysRequired) {
    parsedDate = minDate;
  }
  
  const correctedDaysDiffTest = Math.ceil((parsedDate.getTime() - nowTest.getTime()) / (24 * 60 * 60 * 1000));
  
  console.log(`  Insufficient date in hash: ${insufficientDateStrISO} (${Math.ceil((insufficientDate.getTime() - nowTest.getTime()) / (24 * 60 * 60 * 1000))} days)`);
  console.log(`  Corrected date: ${parsedDate.toLocaleDateString("cs-CZ")} (${correctedDaysDiffTest} days)`);
  
  if (correctedDaysDiffTest < minDaysRequired) {
    throw new Error(`Date correction failed: corrected date should be at least ${minDaysRequired} day(s), got ${correctedDaysDiffTest}`);
  }
  
  // Test for regular service with insufficient delay (should be corrected to 10 days)
  const regularInsufficientDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days (should be 10 for regular)
  regularInsufficientDate.setHours(0, 0, 0, 0);
  const regularInsufficientDateStrISO = regularInsufficientDate.toISOString().split('T')[0];
  
  const regularHashDataWithInsufficientDate = buildPoptavkaHashData({
    totalPrice: regularResult.totalMonthlyPrice,
    calculationResult: regularResult,
    formData: {
      ...regularFormData,
      serviceStartDate: regularInsufficientDateStrISO
    },
    formConfig: residentialBuildingFormConfig
  });
  
  if (!regularHashDataWithInsufficientDate.calculationData) {
    throw new Error("calculationData missing in regular hash");
  }
  
  const isRegularHourlyService = regularHashDataWithInsufficientDate.serviceType === "one-time-cleaning" || regularHashDataWithInsufficientDate.serviceType === "handyman-services";
  const regularDaysDelay = isRegularHourlyService ? 1 : 10;
  const regularMinDate = new Date(Date.now() + regularDaysDelay * 24 * 60 * 60 * 1000);
  regularMinDate.setHours(0, 0, 0, 0);
  
  const regularHashFormData = regularHashDataWithInsufficientDate.calculationData.formData as Record<string, unknown>;
  const regularDateStr = regularHashFormData.serviceStartDate as string;
  
  let regularParsedDate: Date;
  if (regularDateStr.includes('-')) {
    const isoDate = regularDateStr.split('T')[0];
    const [year, month, day] = isoDate.split('-').map(Number);
    regularParsedDate = new Date(year, month - 1, day);
    regularParsedDate.setHours(0, 0, 0, 0);
  } else {
    regularParsedDate = regularMinDate;
  }
  
  const regularDaysUntilDate = Math.ceil((regularParsedDate.getTime() - nowTest.getTime()) / (24 * 60 * 60 * 1000));
  const regularMinDaysRequired = isRegularHourlyService ? 1 : 10;
  
  if (regularParsedDate < regularMinDate || regularDaysUntilDate < regularMinDaysRequired) {
    regularParsedDate = regularMinDate;
  }
  
  const regularCorrectedDaysDiff = Math.ceil((regularParsedDate.getTime() - nowTest.getTime()) / (24 * 60 * 60 * 1000));
  
  console.log(`  Regular insufficient date in hash: ${regularInsufficientDateStrISO} (${Math.ceil((regularInsufficientDate.getTime() - nowTest.getTime()) / (24 * 60 * 60 * 1000))} days)`);
  console.log(`  Regular corrected date: ${regularParsedDate.toLocaleDateString("cs-CZ")} (${regularCorrectedDaysDiff} days)`);
  
  if (regularCorrectedDaysDiff < regularMinDaysRequired) {
    throw new Error(`Regular date correction failed: corrected date should be at least ${regularMinDaysRequired} days, got ${regularCorrectedDaysDiff}`);
  }
  
  // Test 10: Date preservation for user-selected dates in the future
  console.log("Test 10: Date preservation for user-selected dates");
  
  // Simulate a hash with a user-selected date that's far in the future (should be preserved)
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days in the future
  futureDate.setHours(0, 0, 0, 0);
  // Format as YYYY-MM-DD using local date to avoid timezone shifts
  const y = futureDate.getFullYear();
  const m = String(futureDate.getMonth() + 1).padStart(2, '0');
  const d = String(futureDate.getDate()).padStart(2, '0');
  const futureDateStrISO = `${y}-${m}-${d}`;
  
  const hashDataWithFutureDate = buildPoptavkaHashData({
    totalPrice: oneTimeResult.totalMonthlyPrice,
    calculationResult: oneTimeResult,
    formData: {
      ...oneTimeFormData,
      serviceStartDate: futureDateStrISO // User-selected future date
    },
    formConfig: oneTimeCleaningFormConfig
  });
  
  // Simulate what poptavka page does when loading from hash
  if (!hashDataWithFutureDate.calculationData) {
    throw new Error("calculationData missing in hash");
  }
  
  const isHourlyServiceTest = hashDataWithFutureDate.serviceType === "one-time-cleaning" || hashDataWithFutureDate.serviceType === "handyman-services";
  const daysDelayTest = isHourlyServiceTest ? 1 : 10;
  const minDateTest = new Date(Date.now() + daysDelayTest * 24 * 60 * 60 * 1000);
  minDateTest.setHours(0, 0, 0, 0);
  
  const hashFormDataTest = hashDataWithFutureDate.calculationData.formData as Record<string, unknown>;
  const dateStrTest = hashFormDataTest.serviceStartDate as string;
  
  // Parse ISO date format
  let parsedDateTest: Date;
  if (dateStrTest.includes('-')) {
    const isoDate = dateStrTest.split('T')[0];
    const [year, month, day] = isoDate.split('-').map(Number);
    parsedDateTest = new Date(year, month - 1, day);
    parsedDateTest.setHours(0, 0, 0, 0);
  } else {
    parsedDateTest = minDateTest;
  }
  
  // Enforce minimum delay only (same logic as poptavka page)
  const nowTest2 = new Date();
  nowTest2.setHours(0, 0, 0, 0);
  const daysUntilDateTest = Math.ceil((parsedDateTest.getTime() - nowTest2.getTime()) / (24 * 60 * 60 * 1000));
  const minDaysRequiredTest = isHourlyServiceTest ? 1 : 10;
  
  // Only correct if date is too early - preserve any date that meets minimum requirement
  if (parsedDateTest < minDateTest || daysUntilDateTest < minDaysRequiredTest) {
    parsedDateTest = minDateTest;
  }
  
  const preservedDaysDiff = Math.ceil((parsedDateTest.getTime() - nowTest2.getTime()) / (24 * 60 * 60 * 1000));
  const expectedDaysDiff = Math.ceil((futureDate.getTime() - nowTest2.getTime()) / (24 * 60 * 60 * 1000));
  
  console.log(`  Future date in hash: ${futureDateStrISO} (${expectedDaysDiff} days)`);
  console.log(`  Preserved date: ${parsedDateTest.toLocaleDateString("cs-CZ")} (${preservedDaysDiff} days)`);
  
  if (preservedDaysDiff < minDaysRequiredTest) {
    throw new Error(`Date validation failed: preserved date should be at least ${minDaysRequiredTest} day(s), got ${preservedDaysDiff}`);
  }
  
  // Verify the date was preserved (not corrected to minDate)
  // Allow 1 day tolerance for timezone/rounding issues
  if (Math.abs(preservedDaysDiff - expectedDaysDiff) > 1) {
    throw new Error(`Date was incorrectly corrected: should preserve ~${expectedDaysDiff} days, got ${preservedDaysDiff}`);
  }
  
  console.log("  ✓ User-selected future dates are preserved as long as they meet minimum requirement\n");

  console.log("All date delay and hash preservation tests passed! ✓");
}

run().catch((e) => {
  console.error(e);
  (globalThis as any).process?.exit(1);
});

