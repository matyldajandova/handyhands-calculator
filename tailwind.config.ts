import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'raleway': ['var(--font-raleway)', 'system-ui', 'sans-serif'],
        'open-sans': ['var(--font-open-sans)', 'system-ui', 'sans-serif'],
        'heading': ['var(--font-raleway)', 'system-ui', 'sans-serif'],
        'sans': ['var(--font-open-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
