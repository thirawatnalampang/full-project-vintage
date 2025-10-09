/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',   // ✅ บังคับใช้เฉพาะเมื่อมี class="dark"
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
