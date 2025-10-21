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
        'primary-light': 'var(--primary-light)',
        'blue': 'var(--blue)',
        'blue-light': 'var(--blue-light)',
        'grey-50': 'var(--grey-50)',
        'grey-100': 'var(--grey-100)',
        'grey-200': 'var(--grey-200)',
        'grey-300': 'var(--grey-300)',
        'grey-500': 'var(--grey-500)',
        'grey-600': 'var(--grey-600)',
        'grey-700': 'var(--grey-700)',
        'grey-800': 'var(--grey-800)',
        'grey-900': 'var(--grey-900)',
      },
    },
  },
  plugins: [],
};

export default config;
