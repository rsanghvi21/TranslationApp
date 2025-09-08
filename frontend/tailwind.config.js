/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#FFFCF7',
          100: '#FAF7F2', 
          200: '#F2ECE4',
          300: '#E8E2D9'
        },
        ink: {
          500: '#4D4B46',
          700: '#1C1B19',
          900: '#0F0E0D'
        },
        terra: {
          300: '#E8A892',
          400: '#E08C70',
          500: '#DA7756',
          600: '#CC785C',
          700: '#A95E45'
        },
        olive: {
          300: '#B9B7AF',
          500: '#828179',
          600: '#6F6E66',
          700: '#5E5D55'
        },
        'olive-green': {
          50: '#F7F8F4',
          100: '#E8EDE0',
          200: '#D4DBC5',
          300: '#9CAE7E',
          400: '#7A9159',
          500: '#5D7043',
          600: '#4A5A35'
        }
      },
      borderRadius: {
        '2xl': '1rem'
      },
      boxShadow: {
        'claude': '0 1px 2px rgba(0,0,0,0.06), 0 1px 1px rgba(0,0,0,0.04)'
      }
    },
  },
  plugins: [],
}

