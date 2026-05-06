/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'SF Pro Text',
          'system-ui',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        ios: {
          bg:       { DEFAULT: '#F2F2F7', dark: '#000000' },
          card:     { DEFAULT: '#FFFFFF', dark: '#1C1C1E' },
          elevated: { DEFAULT: '#FFFFFF', dark: '#2C2C2E' },
          fill:     { DEFAULT: 'rgba(120,120,128,0.12)', dark: 'rgba(120,120,128,0.24)' },
          label: {
            DEFAULT:   '#000000',
            secondary: 'rgba(60,60,67,0.6)',
            tertiary:  'rgba(60,60,67,0.3)',
          },
          sep:    { DEFAULT: 'rgba(60,60,67,0.2)', dark: 'rgba(84,84,88,0.55)' },
          accent: '#007AFF',
        },
      },
      borderRadius: {
        ios: '12px',
        'ios-lg': '16px',
        'ios-xl': '20px',
      },
      boxShadow: {
        ios: '0 2px 8px rgba(0,0,0,0.08), 0 0 1px rgba(0,0,0,0.04)',
        'ios-md': '0 4px 16px rgba(0,0,0,0.10), 0 0 1px rgba(0,0,0,0.06)',
        'ios-lg': '0 8px 32px rgba(0,0,0,0.14), 0 0 1px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
};
