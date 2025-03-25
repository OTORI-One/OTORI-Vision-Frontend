/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#29378d', // OTORI Blue
          dark: '#212a6b',
          light: '#3c4ebe',
        },
        secondary: {
          DEFAULT: '#7297ce', // Bluegrey
          dark: '#5A7AB0',
          light: '#9DB6E0',
        },
        accent: {
          white: '#F9FAFB', // Soft White
          gray: '#E5E7EB', // Light Gray
        },
        highlight: {
          DEFAULT: '#7bc6d5', // Vibrant Cyan
          dark: '#5BADC0',
          light: '#A5D8E3',
        },
        success: '#10B981', // Green
        error: '#EF4444',   // Red
        warning: '#F59E0B', // Yellow
        info: '#3B82F6',    // Blue
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
} 