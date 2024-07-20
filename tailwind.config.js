/** @type {import('tailwindcss').Config} */
import daisyui from "daisyui"
module.exports = {
  content: ['./src/**/*.{js,svelte,ts}',],/**,'node_modules/preline/dist/*.js' */
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--background-primary)',
          alt: 'var(--background-primary-alt)',
        },
        secondary: {
          DEFAULT: 'var(--background-secondary)',
          alt: 'var(--background-secondary-alt)',
          accent: 'hsl(var(--accent-h), 15%, var(--accent-l))',
          hover: 'var(--interactive-hover)'
        },
        border:{
          DEFAULT: 'var(--background-modifier-border)'
        },
        text:{
          normal: 'var(--text-normal)',
          'on-secondary-accent': 'var(--text-on-accent)',
          accent: 'var(--text-accent)'
        }
      },
      fontSize: {
        base: 'var(----font-text-size)'
      }
    },
  },
    corePlugins: {
      preflight: false,
  },
  plugins: [
    daisyui,
    // require('preline/plugin'),
  ],
  daisyui: {
    themes: false, // false: only light + dark | true: all themes | array: specific themes like this ["light", "dark", "cupcake"]
    darkTheme: "dark", // name of one of the included themes for dark mode
    base: true, // applies background color and foreground color for root element by default
    styled: true, // include daisyUI colors and design decisions for all components
    utils: true, // adds responsive and modifier utility classes
    prefix: "daisy-", // prefix for daisyUI classnames (components, modifiers and responsive class names. Not colors)
    logs: true, // Shows info about daisyUI version and used config in the console when building your CSS
    themeRoot: ":root", // The element that receives theme color CSS variables
  }
}

