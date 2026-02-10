module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"] ,
  theme: {
    extend: {
      colors: {
        ink: "#0B0B0C",
        fog: "#F5F3EF",
        slate: "#1E1F24",
        mist: "#D8D3CA",
        accent: "#F2613F",
        accentDark: "#C2442E",
        moss: "#5B9279"
      },
      fontFamily: {
        display: ["Space Grotesk", "ui-sans-serif", "system-ui"],
        body: ["IBM Plex Sans", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
};
