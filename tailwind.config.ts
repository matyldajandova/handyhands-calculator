import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pdf/**/*.{ts,tsx,html}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'raleway': ['var(--font-raleway)', 'system-ui', 'sans-serif'],
        'open-sans': ['var(--font-open-sans)', 'system-ui', 'sans-serif'],
        'heading': ['var(--font-raleway)', 'system-ui', 'sans-serif'],
        'sans': ['var(--font-open-sans)', 'system-ui', 'sans-serif'],
      },
      colors: {
        'green-success': 'var(--green-success)',
        'green-light': 'var(--green-light)',
        'green-dark': 'var(--green-dark)',
      },
    },
  },
  plugins: [],
};

export default config;
