import { SERVICE_SLUGS } from '@/utils/slug-mapping';
import { serviceTypes } from '@/config/services';

export default function sitemap() {
  const baseUrl = 'https://handyhands-calculator.vercel.app'; // Replace with your actual domain
  
  // Filter out hidden services and get their slugs
  const visibleServices = serviceTypes.filter(service => !service.formConfig?.hidden);
  const visibleSlugs = visibleServices
    .map(service => SERVICE_SLUGS[service.id])
    .filter(Boolean);
  
  const calculatorUrls = visibleSlugs.map(slug => ({
    url: `${baseUrl}/kalkulator/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 1,
    },
    ...calculatorUrls,
  ];
}
