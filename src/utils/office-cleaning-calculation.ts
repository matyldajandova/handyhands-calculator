

// Office cleaning calculation coefficients
const HOURLY_COEFFICIENTS = {
  0.5: 0.85,
  1.0: 1.0,
  1.5: 1.1,
  2.0: 1.3,
  2.5: 1.45, // 2-3 hod
  3.0: 1.6,
  "3+": 1.9 // Více jak 3 hod
};

// Area coefficients for different cleaning frequencies
const AREA_COEFFICIENTS_STANDARD = {
  "0-50": 0.73,
  "50-75": 0.91,
  "75-100": 1.0,
  "100-125": 1.1,
  "125-200": 1.3,
  "200-300": 1.6,
  "300-500": 1.9,
  "500-700": 2.07,
  "700+": 2.67
};

const AREA_COEFFICIENTS_DAILY = {
  "0-50": 0.42,
  "50-75": 0.58,
  "75-100": 0.62,
  "100-125": 0.66,
  "125-200": 0.8,
  "200-300": 0.957,
  "300-500": 1.25,
  "500-700": 1.5,
  "700-1500": 2.4,
  "1500-2500": 3.35,
  "2500+": 3.7
};

// Function to get area coefficient based on cleaning frequency and office area
function getAreaCoefficient(cleaningFrequency: string, officeArea: number): number {
  const isDaily = cleaningFrequency === "daily";
  
  if (officeArea <= 50) return isDaily ? AREA_COEFFICIENTS_DAILY["0-50"] : AREA_COEFFICIENTS_STANDARD["0-50"];
  if (officeArea <= 75) return isDaily ? AREA_COEFFICIENTS_DAILY["50-75"] : AREA_COEFFICIENTS_STANDARD["50-75"];
  if (officeArea <= 100) return isDaily ? AREA_COEFFICIENTS_DAILY["75-100"] : AREA_COEFFICIENTS_STANDARD["75-100"];
  if (officeArea <= 125) return isDaily ? AREA_COEFFICIENTS_DAILY["100-125"] : AREA_COEFFICIENTS_STANDARD["100-125"];
  if (officeArea <= 200) return isDaily ? AREA_COEFFICIENTS_DAILY["125-200"] : AREA_COEFFICIENTS_STANDARD["125-200"];
  if (officeArea <= 300) return isDaily ? AREA_COEFFICIENTS_DAILY["200-300"] : AREA_COEFFICIENTS_STANDARD["200-300"];
  if (officeArea <= 500) return isDaily ? AREA_COEFFICIENTS_DAILY["300-500"] : AREA_COEFFICIENTS_STANDARD["300-500"];
  if (officeArea <= 700) return isDaily ? AREA_COEFFICIENTS_DAILY["500-700"] : AREA_COEFFICIENTS_STANDARD["500-700"];
  
  if (isDaily) {
    if (officeArea <= 1500) return AREA_COEFFICIENTS_DAILY["700-1500"];
    if (officeArea <= 2500) return AREA_COEFFICIENTS_DAILY["1500-2500"];
    return AREA_COEFFICIENTS_DAILY["2500+"];
  }
  
  return AREA_COEFFICIENTS_STANDARD["700+"];
}

// Function to get hourly coefficient
function getHourlyCoefficient(hours: number): number {
  if (hours <= 0.5) return HOURLY_COEFFICIENTS[0.5];
  if (hours <= 1.0) return HOURLY_COEFFICIENTS[1.0];
  if (hours <= 1.5) return HOURLY_COEFFICIENTS[1.5];
  if (hours <= 2.0) return HOURLY_COEFFICIENTS[2.0];
  if (hours <= 3.0) return HOURLY_COEFFICIENTS[2.5]; // 2-3 hod
  return HOURLY_COEFFICIENTS["3+"]; // Více jak 3 hod
}

// Main calculation function for office cleaning
export function calculateOfficeCleaningPrice(
  formData: Record<string, string | number | undefined>, 
  basePrice: number
): {
  finalPrice: number;
  appliedCoefficients: Array<{
    field: string;
    label: string;
    coefficient: number;
    impact: number;
  }>;
  calculationDetails: {
    basePrice: number;
    finalCoefficient: number;
    method: string;
  };
} {
  let finalCoefficient = 1.0;
  const appliedCoefficients: Array<{
    field: string;
    label: string;
    coefficient: number;
    impact: number;
  }> = [];

  // Helper function to add coefficient
  function addCoefficient(field: string, label: string, coefficient: number) {
    if (coefficient !== 1.0) {
      finalCoefficient *= coefficient;
      appliedCoefficients.push({
        field,
        label,
        coefficient,
        impact: (coefficient - 1) * 100
      });
    }
  }

  // 1. Cleaning frequency coefficient
  if (!formData.cleaningFrequency || typeof formData.cleaningFrequency !== 'string') {
    throw new Error('Četnost úklidu je povinná');
  }
  const frequencyCoefficient = getCleaningFrequencyCoefficient(formData.cleaningFrequency);
  addCoefficient("cleaningFrequency", "Četnost úklidu", frequencyCoefficient);

  // 2. Calculation method coefficient
  let methodCoefficient = 1.0;
  let calculationMethod = "";
  
  if (formData.calculationMethod === "hourly" && formData.hoursPerCleaning) {
    const hours = typeof formData.hoursPerCleaning === 'string' ? parseFloat(formData.hoursPerCleaning) : formData.hoursPerCleaning;
    if (hours && !isNaN(hours) && hours > 0) {
      methodCoefficient = getHourlyCoefficient(hours);
      calculationMethod = `Hodinový výpočet (${hours}h)`;
    }
  } else if (formData.calculationMethod === "area" && formData.officeArea) {
    const area = typeof formData.officeArea === 'string' ? parseFloat(formData.officeArea) : formData.officeArea;
    if (area && !isNaN(area) && area > 0) {
      methodCoefficient = getAreaCoefficient(formData.cleaningFrequency, area);
      calculationMethod = `Plošný výpočet (${area}m²)`;
    }
  }
  
  addCoefficient("calculationMethod", calculationMethod, methodCoefficient);

  // 3. Floor type coefficient
  if (!formData.floorType || typeof formData.floorType !== 'string') {
    throw new Error('Typ podlahové krytiny je povinný');
  }
  const floorTypeCoefficient = getFloorTypeCoefficient(formData.floorType);
  addCoefficient("floorType", "Typ podlahové krytiny", floorTypeCoefficient);

  // 4. General cleaning coefficient
  if (!formData.generalCleaning || typeof formData.generalCleaning !== 'string') {
    throw new Error('Požadavek generálního úklidu je povinný');
  }
  
  if (formData.generalCleaning === "yes") {
    addCoefficient("generalCleaning", "Generální úklid", 1.04);
    
    // Window cleaning coefficients would be added here when implemented
    // For now, we'll use placeholder values
    if (formData.generalCleaningWindows === "both-sides") {
      // These coefficients need to be implemented based on window area/count
      // For now using placeholder
      addCoefficient("windowCleaning", "Mytí oken (oboustranně)", 1.0);
      
      // TODO: Add actual window cleaning coefficients based on windowAreaBoth and windowCountBoth
      // when the specific coefficients are provided
    } else if (formData.generalCleaningWindows === "inside-only") {
      addCoefficient("windowCleaning", "Mytí oken (jednostranně)", 1.0);
      
      // TODO: Add actual window cleaning coefficients based on windowAreaInside and windowCountInside
      // when the specific coefficients are provided
    }
  } else {
    addCoefficient("generalCleaning", "Bez generálního úklidu", 0.98);
  }

  // 5. Dishwashing coefficient
  if (!formData.dishwashing || typeof formData.dishwashing !== 'string') {
    throw new Error('Požadavek na mytí nádobí je povinný');
  }
  const dishwashingCoefficient = getDishwashingCoefficient(formData.dishwashing);
  addCoefficient("dishwashing", "Mytí nádobí", dishwashingCoefficient);

  // 6. Toilet cleaning coefficient
  if (!formData.toiletCleaning || typeof formData.toiletCleaning !== 'string') {
    throw new Error('Požadavek na úklid WC je povinný');
  }
  const toiletCoefficient = getToiletCleaningCoefficient(formData.toiletCleaning);
  addCoefficient("toiletCleaning", "Úklid WC", toiletCoefficient);

  // 7. After hours coefficient
  if (!formData.afterHours || typeof formData.afterHours !== 'string') {
    throw new Error('Požadavek na úklid mimo pracovní dobu je povinný');
  }
  const afterHoursCoefficient = getAfterHoursCoefficient(formData.afterHours);
  addCoefficient("afterHours", "Úklid mimo pracovní dobu", afterHoursCoefficient);

  // 8. Location coefficient
  if (!formData.location || typeof formData.location !== 'string') {
    throw new Error('Lokalita je povinná');
  }
  const locationCoefficient = getLocationCoefficient(formData.location);
  addCoefficient("location", "Lokalita", locationCoefficient);

  // Calculate final price
  const finalPrice = Math.round(basePrice * finalCoefficient * 10) / 10; // Round to 0.1 Kč

  return {
    finalPrice,
    appliedCoefficients,
    calculationDetails: {
      basePrice,
      finalCoefficient,
      method: calculationMethod
    }
  };
}

// Helper functions for individual coefficients
function getCleaningFrequencyCoefficient(frequency: string): number {
  const coefficients: Record<string, number> = {
    "daily": 3.67,
    "3x-weekly": 2.0,
    "2x-weekly": 1.67,
    "weekly": 1.0,
    "biweekly": 0.75,
    "daily-basic-weekly": 2.5,
    "daily-basic-weekly-wc": 2.0
  };
  return coefficients[frequency] || 1.0;
}

function getFloorTypeCoefficient(floorType: string): number {
  const coefficients: Record<string, number> = {
    "pvc": 0.96,
    "stone": 0.96,
    "floating": 0.96,
    "ceramic": 0.93,
    "carpet": 1.06
  };
  return coefficients[floorType] || 1.0;
}

function getDishwashingCoefficient(dishwashing: string): number {
  const coefficients: Record<string, number> = {
    "yes": 1.02,
    "no": 0.97,
    "dishwasher-only": 1.01
  };
  return coefficients[dishwashing] || 1.0;
}

function getToiletCleaningCoefficient(toiletCleaning: string): number {
  const coefficients: Record<string, number> = {
    "yes": 1.05,
    "no": 0.96
  };
  return coefficients[toiletCleaning] || 1.0;
}

function getAfterHoursCoefficient(afterHours: string): number {
  const coefficients: Record<string, number> = {
    "yes": 1.0,
    "no": 1.05
  };
  return coefficients[afterHours] || 1.0;
}

function getLocationCoefficient(location: string): number {
  const coefficients: Record<string, number> = {
    "prague": 1.0,
    "stredocesky": 0.96078,
    "karlovarsky": 0.72549,
    "plzensky": 0.75686,
    "ustecky": 0.69019,
    "jihocesky": 0.75294,
    "liberecky": 0.76863,
    "kralovehradecky": 0.75294,
    "pardubicky": 0.75294,
    "vysocina": 0.68235,
    "jihomoravsky": 0.82352,
    "olomoucky": 0.71372,
    "zlinsky": 0.71372,
    "moravskoslezsky": 0.65098
  };
  return coefficients[location] || 1.0;
}
