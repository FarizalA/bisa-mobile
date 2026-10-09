export default ({ config }) => ({
  ...config,
  expo: {
    ...config.expo,
    name: "BISA",
    slug: "bisa-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon1.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    scheme: "bisa",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.bisaapp.app",
    },
    android: {
      package: "com.bisaapp.app",
      permissions: [
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.FOREGROUND_SERVICE",
      ],
      adaptiveIcon: {
        backgroundColor: "#faf8ff",
        foregroundImage: "./assets/icon1.png",
      },
      config: {
        googleMaps: {
          // Isi EXPO_PUBLIC_GOOGLE_MAPS_APIKEY di .env / EAS env untuk tiles native. Tanpa ini Maps akan grey tapi TIDAK FC.
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_APIKEY || undefined,
        },
      },
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/favicon.png",
    },
    plugins: ["expo-router"],
    extra: {
      router: {},
      eas: {
        projectId: "2135c97e-db09-4048-8ce6-16ca454228bf",
      },
    },
    owner: "sayyang",
  },
});
