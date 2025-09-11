// Slug mapping for pretty URLs
export const SERVICE_SLUGS: Record<string, string> = {
  "residential-building": "cinzovni-domy",
  "panel-building": "panelove-domy", 
  "office-cleaning": "uklid-kancelari",
  "commercial-spaces": "komerci-prostory",
  "home-cleaning": "uklid-domacnosti",
  "one-time-cleaning": "jednorazovy-uklid",
  "handyman-services": "myti-oken-sluzby"
};

// Reverse mapping from slug to service ID
export const SLUG_TO_SERVICE: Record<string, string> = Object.fromEntries(
  Object.entries(SERVICE_SLUGS).map(([serviceId, slug]) => [slug, serviceId])
);

// Get service ID from slug
export function getServiceIdFromSlug(slug: string): string | null {
  return SLUG_TO_SERVICE[slug] || null;
}

// Get slug from service ID
export function getSlugFromServiceId(serviceId: string): string | null {
  return SERVICE_SLUGS[serviceId] || null;
}

// Get all available slugs
export function getAllSlugs(): string[] {
  return Object.values(SERVICE_SLUGS);
}
