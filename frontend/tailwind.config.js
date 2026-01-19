/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Product UI (Dark Mode)
        dark: {
          bg: '#0B0F14',
          surface: '#111827',
          border: '#1F2937',
          text: {
            primary: '#E5E7EB',
            secondary: '#9CA3AF',
          }
        },
        // Landing Page (Light Mode)
        light: {
          bg: '#FFFFFF',
          text: {
            primary: '#0F172A',
            secondary: '#475569',
          }
        },
        // Accent color (use sparingly)
        accent: {
          DEFAULT: '#4F8CFF',
          hover: '#3B7BEC',
          light: 'rgba(79, 140, 255, 0.1)',
        },
        // Text colors
        text: {
          light: '#0F172A',
          dark: '#E5E7EB',
          primary: '#E5E7EB',
          secondary: '#9CA3AF',
          muted: '#9CA3AF',
        },
        // Background colors
        background: {
          light: '#F9FAFB',
          dark: '#111827',
          'dark-gradient-start': '#3B0764',
          'dark-gradient-end': '#8B5CF6',
        },
        // Card colors
        card: {
          background: 'rgba(255, 255, 255, 0.08)',
          border: 'rgba(255, 255, 255, 0.12)',
          'light-background': '#FFFFFF',
          'light-border': '#E5E7EB',
        },
        // Legacy compatibility
        plum: {
          50: '#F5F7FF',
          100: '#EBF0FF',
          200: '#DDE6FF',
          300: '#C4D5FE',
          400: '#A4BCFD',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'Manrope', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '40px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.15)',
        'glass-lg': '0 12px 40px rgba(0, 0, 0, 0.25)',
        'glow': '0 0 25px rgba(139, 92, 246, 0.4)',
        'glow-lg': '0 0 35px rgba(147, 197, 253, 0.5)',
        'primary-glow': '0 0 25px rgba(139, 92, 246, 0.4)',
        'accent-glow': '0 0 30px rgba(147, 197, 253, 0.5)',
        'soft': '0 4px 12px rgba(0, 0, 0, 0.08)',
      },
      borderRadius: {
        'DEFAULT': '12px',
        'card': '12px',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      }
    },
  },
  plugins: [
    // Forms and typography plugins can be added later if needed
    // require('@tailwindcss/forms'),
    // require('@tailwindcss/typography')
  ]
}