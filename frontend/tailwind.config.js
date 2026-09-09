/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#12161F',
          700: '#2B3242',
          500: '#5B6472',
          300: '#9AA3B2',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          sunken: '#F6F7F9',
          border: '#E3E6EB',
        },
        ledger: {
          DEFAULT: '#1B3A5C',
          light: '#2E5680',
          tint: '#EAF0F6',
        },
        success: {
          DEFAULT: '#1B8A5A',
          tint: '#E8F5EE',
        },
        danger: {
          DEFAULT: '#B23A2E',
          tint: '#FBEAE8',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['"Inter"', 'sans-serif'],
        mono: ['"Space Grotesk"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(18, 22, 31, 0.04)',
        raised: '0 4px 16px rgba(18, 22, 31, 0.08)',
      },
      borderRadius: {
        card: '10px',
      },
    },
  },
  plugins: [],
}
