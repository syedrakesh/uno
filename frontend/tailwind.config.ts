import type { Config } from 'tailwindcss';
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter','system-ui','sans-serif'], display: ['Outfit','sans-serif'] },
      colors: {
        surface: {
          bg:       'hsl(var(--surface-bg) / <alpha-value>)',
          card:     'hsl(var(--surface-card) / <alpha-value>)',
          elevated: 'hsl(var(--surface-elevated) / <alpha-value>)',
          border:   'hsl(var(--surface-border) / <alpha-value>)',
        },
      },
      animation: {
        'float':       'float 3s ease-in-out infinite',
        'pulse-glow':  'pulse-glow 2s ease-in-out infinite',
        'slide-up':    'slide-up 0.3s ease-out forwards',
        'scale-in':    'scale-in 0.25s ease-out forwards',
        'uno-flash':   'uno-flash 0.8s ease-in-out 3',
        'spin-slow':   'spin 3s linear infinite',
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
};
export default config;
