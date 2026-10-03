const { withAndroidManifest, AndroidConfig } = require("@expo/config-plugins");

module.exports = function withEmergencyForegroundService(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    manifest.usesPermission = manifest.usesPermission || [];
    const addPermission = (name) => {
      if (!manifest.usesPermission.some((p) => p.$?.["android:name"] === name)) {
        manifest.usesPermission.push({ $: { "android:name": name } });
      }
    };
    addPermission("android.permission.FOREGROUND_SERVICE");
    addPermission("android.permission.FOREGROUND_SERVICE_LOCATION");
    addPermission("android.permission.POST_NOTIFICATIONS");

    const app = manifest.application?.[0];
    if (!app) return mod;

    app.service = app.service || [];
    const exists = app.service.some((s) => s.$?.["android:name"] === ".EmergencyMonitoringService");
    if (!exists) {
      app.service.push({
        $: {
          "android:name": ".EmergencyMonitoringService",
          "android:enabled": "true",
          "android:exported": "false",
          "android:foregroundServiceType": "location|health",
        },
      });
    }
    return mod;
  });
};
