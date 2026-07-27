const config = {
  content: [
    "./src/views/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      /** ~87,5 % de l’échelle Tailwind par défaut — police plus compacte dans tous les modules */
      fontSize: {
        xs: ["0.65625rem", { lineHeight: "0.875rem" }],
        sm: ["0.765625rem", { lineHeight: "1.09375rem" }],
        base: ["0.875rem", { lineHeight: "1.3125rem" }],
        lg: ["0.984375rem", { lineHeight: "1.53125rem" }],
        xl: ["1.09375rem", { lineHeight: "1.53125rem" }],
        "2xl": ["1.3125rem", { lineHeight: "1.75rem" }],
        "3xl": ["1.640625rem", { lineHeight: "1.96875rem" }],
        "4xl": ["1.96875rem", { lineHeight: "2.1875rem" }],
        "5xl": ["2.625rem", { lineHeight: "1" }],
        "6xl": ["3.28125rem", { lineHeight: "1" }],
        "7xl": ["3.9375rem", { lineHeight: "1" }],
        "8xl": ["5.25rem", { lineHeight: "1" }],
        "9xl": ["7rem", { lineHeight: "1" }],
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        tran: {
          mauve: {
            50: '#f4f3fa',
            100: '#e8e6f4',
            200: '#d1cee9',
            300: '#b0abda',
            400: '#8a84c4',
            500: '#6b6cae',
            600: '#5a5b9a',
            700: '#4a4b85',
            800: '#3d3e6b',
            900: '#2f3055',
            950: '#1e1f38',
          },
          mustard: {
            50: '#fbf8ed',
            100: '#f6f0d5',
            200: '#ecdea8',
            300: '#e0c974',
            400: '#d4af37',
            500: '#c9a227',
            600: '#b8932a',
            700: '#9a7a22',
            800: '#7d621e',
            900: '#664f1a',
            950: '#3d2f0f',
          },
        },
        cptb: {
          blue: '#0018A8',
          'blue-dark': '#001270',
          'blue-mid': '#0022c9',
          'blue-light': '#1a3fd4',
          gold: '#EBB02D',
          'gold-light': '#f5c95a',
          'gold-dark': '#c99420',
          red: '#E31B23',
          green: '#2d6a4f',
          'green-light': '#40916c',
        },
        lux: {
          ink: '#0c0a09',
          charcoal: '#1c1917',
          mist: '#fafaf9',
          champagne: '#f5f0e8',
          gold: '#EBB02D',
          'gold-bright': '#f5c95a',
          bronze: '#c99420',
        },
        brand: {
          50: '#eef0ff',
          100: '#dde3ff',
          200: '#b8c4ff',
          300: '#8a9eff',
          400: '#5a75f5',
          500: '#2f4fe8',
          600: '#0018A8',
          700: '#00148f',
          800: '#001070',
          900: '#000c52',
          950: '#000833',
        },
        surface: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          900: "#0f172a",
        },
      },
      boxShadow: {
        glass:
          "0 8px 32px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04), inset 0 1px 0 0 rgba(255,255,255,0.7)",
        premium:
          "0 28px 56px -16px rgba(12, 10, 9, 0.16), 0 12px 24px -10px rgba(0, 24, 168, 0.08), inset 0 1px 0 0 rgba(255,255,255,0.65)",
        glow: "0 0 40px -8px rgba(0, 24, 168, 0.45)",
        innerGlow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.6)",
        lux:
          '0 32px 64px -16px rgba(0, 18, 80, 0.35), 0 0 0 1px rgba(235, 176, 45, 0.15), inset 0 1px 0 0 rgba(255,255,255,0.06)',
        'lux-soft':
          '0 20px 44px -14px rgba(0, 24, 168, 0.1), 0 8px 16px -10px rgba(12, 10, 9, 0.08), 0 0 0 1px rgba(235, 176, 45, 0.08)',
        'lux-glow': '0 0 48px -8px rgba(235, 176, 45, 0.28)',
        'dash-card':
          '0 16px 40px -18px rgba(12, 10, 9, 0.12), 0 0 0 1px rgba(201, 162, 39, 0.07), inset 0 1px 0 0 rgba(255,255,255,0.88)',
        'dash-card-hover':
          '0 28px 56px -20px rgba(12, 10, 9, 0.16), 0 0 0 1px rgba(201, 162, 39, 0.14), inset 0 1px 0 0 rgba(255,255,255,0.95)',
        'nav-elevated':
          '0 1px 0 0 rgba(255,255,255,0.9) inset, 0 18px 40px -20px rgba(12, 10, 9, 0.12), 0 0 0 1px rgba(201, 162, 39, 0.08)',
      },
      backgroundImage: {
        "gradient-premium":
          "linear-gradient(135deg, #f8fafc 0%, #eef0ff 40%, #fffbeb 100%)",
        "gradient-nav":
          "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(250,249,247,0.92) 100%)",
        "mesh-premium":
          "radial-gradient(at 40% 20%, rgba(0, 24, 168, 0.1) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(235, 176, 45, 0.12) 0px, transparent 45%), radial-gradient(at 0% 50%, rgba(45, 106, 79, 0.08) 0px, transparent 50%)",
        "mesh-dashboard":
          "radial-gradient(ellipse 90% 60% at 10% -10%, rgba(0, 24, 168, 0.07), transparent 55%), radial-gradient(ellipse 70% 50% at 95% 5%, rgba(235, 176, 45, 0.1), transparent 50%), radial-gradient(ellipse 50% 40% at 50% 100%, rgba(30, 31, 56, 0.04), transparent 55%)",
        "sheen-gold":
          "linear-gradient(115deg, transparent 0%, rgba(235, 176, 45, 0.12) 45%, transparent 70%)",
      },
      animation: {
        shimmer: "shimmer 2.5s ease-in-out infinite",
        "fade-up": "fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "dash-enter": "dashEnter 0.55s cubic-bezier(0.22, 1, 0.36, 1) both",
        "soft-pulse": "softPulse 3.2s ease-in-out infinite",
      },
      keyframes: {
        shimmer: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        dashEnter: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        softPulse: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "0.9" },
        },
      },
      borderRadius: {
        "4xl": "2rem",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
