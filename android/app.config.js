module.exports = ({ config }) => ({
  ...config,
  name: "RT/RW-SID CONNECT",
  slug: "rt-rw-sid-connect",
  version: "1.3.0",
  orientation: "portrait",
  scheme: "rtrwsidconnect",
  android: {
    ...config.android,
    package: "id.rtrwsid.connect",
    versionCode: 3,
    config: {
      ...(config.android?.config || {}),
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ""
      }
    },
    permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"]
  },
  ios: {
    ...config.ios,
    bundleIdentifier: "id.rtrwsid.connect",
    supportsTablet: true,
    infoPlist: {
      ...(config.ios?.infoPlist || {}),
      NSLocationWhenInUseUsageDescription: "Lokasi digunakan saat Anda membuka peta wilayah atau mengaktifkan bantuan darurat."
    }
  },
  plugins: ["expo-secure-store", "expo-location", ["expo-sensors", { motionPermission: "RT/RW-SID CONNECT menggunakan sensor gerak untuk mendeteksi kemungkinan kejadian darurat." }]],
  extra: {
    ...(config.extra || {}),
    smartVillage: true,
    googleMapsConfigured: Boolean(process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY)
  }
});
