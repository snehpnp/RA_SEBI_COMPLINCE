import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f7ff',
          100: '#ebf0fe',
          200: '#dce5fe',
          300: '#c2d2fd',
          400: '#9db4fa',
          500: '#708cf7',
          600: '#4763f0',
          700: '#344be1',
          800: '#2c3cb7',
          900: '#283791',
          950: '#1b2257',
        },
        slate: {
          950: '#070a13',
        },
        premium: {
          bg: 'var(--premium-bg)',
          cards: 'var(--premium-cards)',
          primary: 'var(--premium-primary)',
          success: 'var(--premium-success)',
          warning: 'var(--premium-warning)',
          danger: 'var(--premium-danger)',
          text: 'var(--premium-text)',
          border: 'var(--premium-border)'
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
export default config
