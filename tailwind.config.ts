import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e8f0fc',
          100: '#d5e3fb',
          200: '#bdd4f8',
          300: '#95b8f4',
          400: '#6b9aee',
          500: '#4f7ce6',
          600: '#2B68C4',
          700: '#2458a8',
          800: '#1f4d8f',
          900: '#1b3e78',
          950: '#112746',
        },
        creator: {
          50: '#edf6eb',
          100: '#daeddb',
          200: '#c2e1c4',
          300: '#a1d3a5',
          400: '#84BE82',
          500: '#6fab6d',
          600: '#548c53',
          700: '#406d40',
          800: '#335334',
          900: '#2a402b',
          950: '#18221a',
        },
        business: {
          50: '#f4f7fb',
          100: '#eaeff6',
          200: '#d6dee8',
          300: '#b0bfd3',
          400: '#7f95af',
          500: '#547094',
          600: '#183056',
          700: '#10203e',
          800: '#0d1a31',
          900: '#0a141f',
          950: '#050a12',
        },
        surface: {
          customer: '#E8F0FC',
          creator: '#EDF6EB',
          business: '#F4F7FB',
          warning: '#FAF1F1',
        },
        ink: {
          50: '#f7f7f6',
          100: '#e5e4e2',
          200: '#cac8c4',
          300: '#a8a59f',
          400: '#85817a',
          500: '#6a665f',
          600: '#54514b',
          700: '#45423e',
          800: '#3a3834',
          900: '#1f1e1b',
          950: '#12110f',
        },
      },
    },
  },
  plugins: [],
};

export default config;