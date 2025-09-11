import { getAllSlugs } from '@/utils/slug-mapping';

export default function sitemap() {
  const baseUrl = 'https://handyhands-calculator.vercel.app'; // Replace with your actual domain
  const slugs = getAllSlugs();
  
  const calculatorUrls = slugs.map(slug => ({
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
