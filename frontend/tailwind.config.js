/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // WasteFlow Blue + Green Theme
        primary: {
          50: '#eef7ff',
          100: '#d9ecff',
          200: '#b9dcff',
          300: '#89c4ff',
          400: '#58a9ff',
          500: '#2d8cff',
          600: '#0b4cad',
          700: '#083f90',
          800: '#093574',
          900: '#0a2f5f',
        },
        secondary: {
          50: '#f4f7fa',
          100: '#e8edf3',
          200: '#d6dee8',
          300: '#bcc8d6',
          400: '#8fa1b6',
          500: '#6f8197',
          600: '#53657b',
          700: '#3f5063',
          800: '#293747',
          900: '#162131',
        },
        success: {
          light: '#a6f0bf',
          DEFAULT: '#2bb35f',
          dark: '#157f42',
        },
        warning: {
          light: '#fde047',
          DEFAULT: '#eab308',
          dark: '#a16207',
        },
        danger: {
          light: '#fca5a5',
          DEFAULT: '#ef4444',
          dark: '#b91c1c',
        },
        info: {
          light: '#7dd3fc',
          DEFAULT: '#0ea5e9',
          dark: '#0369a1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 18px -4px rgba(11, 76, 173, 0.18), 0 10px 22px -6px rgba(21, 127, 66, 0.12)',
        'soft-lg': '0 14px 42px -12px rgba(11, 76, 173, 0.24)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
