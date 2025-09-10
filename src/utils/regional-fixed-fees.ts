// Regional fixed fees for one-time cleaning, home cleaning and handyman services
// These fees are not affected by inflation or coefficients

export const ONE_TIME_CLEANING_FEES: Record<string, number> = {
  "prague": 250,
  "stredocesky": 225,
  "karlovarsky": 200,
  "plzensky": 200,
  "ustecky": 200,
  "jihocesky": 200,
  "liberecky": 200,
  "kralovehradecky": 200,
  "pardubicky": 200,
  "vysocina": 200,
  "jihomoravsky": 225,
  "olomoucky": 200,
  "zlinsky": 200,
  "moravskoslezsky": 200
};

// Home cleaning uses the same regional fixed fees as one-time cleaning
export const HOME_CLEANING_FEES: Record<string, number> = {
  "prague": 250,
  "stredocesky": 225,
  "karlovarsky": 200,
  "plzensky": 200,
  "ustecky": 200,
  "jihocesky": 200,
  "liberecky": 200,
  "kralovehradecky": 200,
  "pardubicky": 200,
  "vysocina": 200,
  "jihomoravsky": 225,
  "olomoucky": 200,
  "zlinsky": 200,
  "moravskoslezsky": 200
};

export const HANDYMAN_SERVICES_FEES: Record<string, number> = {
  "prague": 350,
  "stredocesky": 325,
  "karlovarsky": 300,
  "plzensky": 300,
  "ustecky": 300,
  "jihocesky": 300,
  "liberecky": 300,
  "kralovehradecky": 300,
  "pardubicky": 300,
  "vysocina": 300,
  "jihomoravsky": 325,
  "olomoucky": 300,
  "zlinsky": 300,
  "moravskoslezsky": 300
};

export function getFixedFeeForService(serviceId: string, regionKey: string): number {
  if (serviceId === "one-time-cleaning") {
    return ONE_TIME_CLEANING_FEES[regionKey] || 200; // Default to 200 if region not found
  }
  if (serviceId === "home-cleaning") {
    return HOME_CLEANING_FEES[regionKey] || 200; // Default to 200 if region not found
  }
  if (serviceId === "handyman-services") {
    return HANDYMAN_SERVICES_FEES[regionKey] || 300; // Default to 300 if region not found
  }
  return 0; // No fixed fee for other services
}
