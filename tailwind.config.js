/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        modern: {
          primary: '#4573d2',
          hover: '#3560b7',
          'primary-hover': '#3560b7',
          bg: '#f9f8f8',
          sidebar: '#1e1f21',
          'sidebar-hover': '#2d2e32',
          surface: '#ffffff',
          border: '#edeae9',
          'border-dark': '#e0dedd',
          text: '#1e1f21',
          muted: '#6d6e6f',
          red: '#f06a6a',
          orange: '#f28b49',
          yellow: '#f8df72',
          green: '#48cfad',
          teal: '#37bc9b',
          blue: '#4fc1e9',
          purple: '#ac92ec',
          pink: '#ec87c0',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
