/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        ror: {
          cyan: '#22d3ee',
          purple: '#c084fc',
          red: '#ef4444',
          darkBg: '#050508',
          panelBg: 'rgba(20, 20, 30, 0.7)',
          panelBorder: 'rgba(255, 255, 255, 0.15)',
        }
      },
      boxShadow: {
        'ror-cyan': '0 0 10px rgba(34, 211, 238, 0.5)',
        'ror-purple': '0 0 10px rgba(192, 132, 252, 0.5)',
        'ror-red': '0 0 10px rgba(239, 68, 68, 0.5)',
      }
    },
  },
  plugins: [],
}

