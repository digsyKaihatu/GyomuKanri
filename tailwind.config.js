/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./js/**/*.{js,ts,jsx,tsx}", // jsフォルダ以下のすべてのJavaScriptファイルを対象にする
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
