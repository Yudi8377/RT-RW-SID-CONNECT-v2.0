const { withAndroidManifest, withDangerousMod, withMainApplication } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const SERVICE_JAVA = `package id.rtrwsid.connect;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class EmergencyMonitoringService extends Service implements SensorEventListener {
  private static final String CHANNEL_ID = "emergency_monitoring";
  private static final int NOTIFICATION_ID = 7401;
  private static final int IMPACT_NOTIFICATION_ID = 7402;
  private SensorManager sensorManager;
  private Sensor accelerometer;
  private long lastAlertAt = 0L;

  @Override public void onCreate() {
    super.onCreate();
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      NotificationChannel channel = new NotificationChannel(
        CHANNEL_ID, "Perlindungan Darurat", NotificationManager.IMPORTANCE_HIGH
      );
      channel.setDescription("Monitoring sensor gerak untuk dugaan insiden. Konfirmasi tetap dilakukan pengguna.");
      NotificationManager nm = getSystemService(NotificationManager.class);
      nm.createNotificationChannel(channel);
    }
    sensorManager = (SensorManager) getSystemService(SENSOR_SERVICE);
    if (sensorManager != null) accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
  }

  @Override public int onStartCommand(Intent intent, int flags, int startId) {
    Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Perlindungan Darurat aktif")
      .setContentText("Sensor gerak aktif. Dugaan insiden akan meminta konfirmasi.")
      .setSmallIcon(android.R.drawable.ic_dialog_alert)
      .setOngoing(true)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .build();
    startForeground(NOTIFICATION_ID, notification);
    if (sensorManager != null && accelerometer != null) {
      sensorManager.unregisterListener(this);
      sensorManager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_GAME);
    }
    return START_STICKY;
  }

  @Override public void onSensorChanged(SensorEvent event) {
    if (event.sensor.getType() != Sensor.TYPE_ACCELEROMETER || event.values.length < 3) return;
    double g = Math.sqrt(
      event.values[0] * event.values[0] +
      event.values[1] * event.values[1] +
      event.values[2] * event.values[2]
    ) / SensorManager.GRAVITY_EARTH;
    long now = System.currentTimeMillis();
    if (g >= 3.0 && now - lastAlertAt > 30000L) {
      lastAlertAt = now;
      showPossibleIncidentNotification();
    }
  }

  private void showPossibleIncidentNotification() {
    Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
    PendingIntent pending = null;
    if (launchIntent != null) {
      launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
      pending = PendingIntent.getActivity(
        this, 7402, launchIntent,
        PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0)
      );
    }
    NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_dialog_alert)
      .setContentTitle("Kemungkinan insiden terdeteksi")
      .setContentText("Buka RT/RW-SID CONNECT untuk konfirmasi kondisi dan bantuan.")
      .setAutoCancel(true)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM);
    if (pending != null) b.setContentIntent(pending);
    NotificationManager nm = getSystemService(NotificationManager.class);
    if (nm != null) nm.notify(IMPACT_NOTIFICATION_ID, b.build());
  }

  @Override public void onAccuracyChanged(Sensor sensor, int accuracy) {}
  @Override public void onDestroy() {
    if (sensorManager != null) sensorManager.unregisterListener(this);
    super.onDestroy();
  }
  @Nullable @Override public IBinder onBind(Intent intent) { return null; }
}
`;

const MODULE_JAVA=`package id.rtrwsid.connect;

import android.content.Intent;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class EmergencyMonitoringModule extends ReactContextBaseJavaModule {
  public EmergencyMonitoringModule(ReactApplicationContext context) { super(context); }
  @Override public String getName() { return "EmergencyMonitoring"; }

  @ReactMethod public void start(Promise promise) {
    try {
      Intent intent = new Intent(getReactApplicationContext(), EmergencyMonitoringService.class);
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        ContextCompat.startForegroundService(getReactApplicationContext(), intent);
      } else {
        getReactApplicationContext().startService(intent);
      }
      promise.resolve(true);
    } catch (Exception e) {
      promise.reject("EMERGENCY_SERVICE_START_FAILED", e);
    }
  }

  @ReactMethod public void stop(Promise promise) {
    try {
      Intent intent = new Intent(getReactApplicationContext(), EmergencyMonitoringService.class);
      promise.resolve(getReactApplicationContext().stopService(intent));
    } catch (Exception e) {
      promise.reject("EMERGENCY_SERVICE_STOP_FAILED", e);
    }
  }
}
`;

const PACKAGE_JAVA=`package id.rtrwsid.connect;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class EmergencyMonitoringPackage implements ReactPackage {
  @Override public List<NativeModule> createNativeModules(ReactApplicationContext context) {
    List<NativeModule> modules = new ArrayList<>();
    modules.add(new EmergencyMonitoringModule(context));
    return modules;
  }
  @Override public List<ViewManager> createViewManagers(ReactApplicationContext context) {
    return Collections.emptyList();
  }
}
`;

module.exports = function withEmergencyForegroundService(config) {
  config = withDangerousMod(config, ["android", async (mod) => {
    const root = mod.modRequest.platformProjectRoot;
    const dir = path.join(root, "app", "src", "main", "java", "id", "rtrwsid", "connect");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "EmergencyMonitoringService.java"), SERVICE_JAVA);
    fs.writeFileSync(path.join(dir, "EmergencyMonitoringModule.java"), MODULE_JAVA);
    fs.writeFileSync(path.join(dir, "EmergencyMonitoringPackage.java"), PACKAGE_JAVA);
    return mod;
  }]);

  config = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    manifest.usesPermission = manifest.usesPermission || [];
    const addPermission = (name) => {
      if (!manifest.usesPermission.some((p) => p.$?.["android:name"] === name)) {
        manifest.usesPermission.push({ $: { "android:name": name } });
      }
    };
    addPermission("android.permission.FOREGROUND_SERVICE");
    addPermission("android.permission.FOREGROUND_SERVICE_HEALTH");
    addPermission("android.permission.HIGH_SAMPLING_RATE_SENSORS");
    addPermission("android.permission.POST_NOTIFICATIONS");
    const app = manifest.application?.[0];
    if (!app) return mod;
    app.service = app.service || [];
    if (!app.service.some((s) => s.$?.["android:name"] === ".EmergencyMonitoringService")) {
      app.service.push({ $: {
        "android:name": ".EmergencyMonitoringService",
        "android:enabled": "true",
        "android:exported": "false",
        "android:foregroundServiceType": "health"
      }});
    }
    return mod;
  });

  return withMainApplication(config, (mod) => {
    let c = mod.modResults.contents;
    const imp = "import id.rtrwsid.connect.EmergencyMonitoringPackage";
    if (!c.includes(imp)) {
      c = c.replace(/(package[^\n]+\n)/, "$1" + imp + "\n");
    }
    if (c.includes("PackageList(this).packages")) {
      c = c.replace(
        /PackageList\(this\)\.packages/g,
        "PackageList(this).packages.apply { add(EmergencyMonitoringPackage()) }"
      );
    } else if (c.includes("new PackageList(this).getPackages()")) {
      c = c.replace(
        "new PackageList(this).getPackages()",
        "new PackageList(this).getPackages()"
      ).replace(
        /(List<ReactPackage> packages = new PackageList\(this\)\.getPackages\(\);)/,
        "$1\n    packages.add(new EmergencyMonitoringPackage());"
      );
    }
    mod.modResults.contents = c;
    return mod;
  });
};
