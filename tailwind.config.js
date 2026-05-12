/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#C0392B",      // rouge restaurant
        secondary: "#E67E22",    // orange chaud
        dark: "#1A1A2E",         // fond sombre
        light: "#FDF6EC",        // fond clair crème
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Playfair Display', 'serif'],
      }
    },
  },
  plugins: [],
}