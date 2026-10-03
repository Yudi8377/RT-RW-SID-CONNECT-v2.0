package id.rtrwsid.connect;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import androidx.annotation.Nullable;

public class EmergencyMonitoringService extends Service {
  private static final String CHANNEL_ID = "emergency_monitoring";
  private static final int NOTIFICATION_ID = 7401;

  @Override public void onCreate() {
    super.onCreate();
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      NotificationChannel channel = new NotificationChannel(
        CHANNEL_ID, "Perlindungan Darurat", NotificationManager.IMPORTANCE_HIGH
      );
      channel.setDescription("Monitoring perlindungan darurat RT/RW-SID CONNECT");
      NotificationManager nm = getSystemService(NotificationManager.class);
      nm.createNotificationChannel(channel);
    }
  }

  @Override public int onStartCommand(Intent intent, int flags, int startId) {
    Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
      ? new Notification.Builder(this, CHANNEL_ID)
      : new Notification.Builder(this);
    builder.setContentTitle("Perlindungan Darurat aktif")
      .setContentText("RT/RW-SID CONNECT siap memeriksa kemungkinan insiden.")
      .setSmallIcon(android.R.drawable.ic_dialog_alert)
      .setOngoing(true)
      .setCategory(Notification.CATEGORY_SERVICE)
      .setPriority(Notification.PRIORITY_HIGH);
    startForeground(NOTIFICATION_ID, builder.build());
    return START_STICKY;
  }

  @Override public void onDestroy() {
    super.onDestroy();
  }

  @Nullable @Override public IBinder onBind(Intent intent) { return null; }
}
