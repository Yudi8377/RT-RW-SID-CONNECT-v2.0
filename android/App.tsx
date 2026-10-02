import "react-native-url-polyfill/auto";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createClient, Session } from "@supabase/supabase-js";
import { enqueueRequest, flushQueue, queuedCount } from "./src/offlineQueue";

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://gzdusguveeeflmlvvmwe.supabase.co";
const KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const storage = {
  getItem: (k: string) => SecureStore.getItemAsync(k),
  setItem: (k: string, v: string) => SecureStore.setItemAsync(k, v),
  removeItem: (k: string) => SecureStore.deleteItemAsync(k),
};
const sb = createClient(URL, KEY, {
  auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

type Tab = "home" | "services" | "news" | "agenda" | "room";

const newsDemo = [
  ["DESA", "29 SEP 2026", "Digitalisasi desa bukan sekadar teknologi.", "Informasi, pelayanan, komunitas, dan ekonomi lokal dipertemukan dalam satu ruang."],
  ["EKONOMI", "28 SEP 2026", "UMKM lokal menemukan ruang baru untuk tumbuh.", "Ruang digital membantu pelaku usaha memperluas jangkauan dan menemukan komunitas."],
  ["KOMUNITAS", "27 SEP 2026", "Gotong royong menjadi agenda bersama warga.", "Agenda komunitas terhubung dengan kalender wilayah agar mudah ditemukan."],
];

const agendaDemo = [
  ["07", "OKT", "RAPAT RT", "Musyawarah warga bulan Oktober", "15.00 WIB", "Balai Warga", "Koordinasi pelayanan, kebersihan, keamanan, dan agenda bulan berjalan."],
  ["07", "NOV", "OLAHRAGA", "Olahraga bersama warga", "15.00 WIB", "Lapangan Warga", "Kegiatan komunitas dan pembinaan pemuda."],
  ["07", "DES", "GOTONG ROYONG", "Kerja bakti lingkungan", "07.00 WIB", "Wilayah RT", "Pemeliharaan lingkungan dan fasilitas bersama."],
];

const services = [
  ["Surat & Administrasi", "Informasi persyaratan dan alur layanan warga.", "▤"],
  ["Pengaduan Warga", "Sampaikan masalah lingkungan, fasilitas, sosial, atau keamanan.", "◌"],
  ["Layanan RT/RW", "Kegiatan, verifikasi, dan layanan sesuai kewenangan.", "⌂"],
  ["Lacak Permohonan", "Pantau status layanan yang sudah diajukan.", "✓"],
  ["Informasi Publik", "Lihat data agregat dan informasi wilayah yang aman.", "◉"],
  ["Komunitas", "Temukan agenda dan kegiatan warga.", "◎"],
];

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [session, setSession] = useState<Session | null>(null);
  const [auth, setAuth] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<any>(null);
  const [news, setNews] = useState(newsDemo);
  const [queueSize, setQueueSize] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    sb.auth.getSession().then(async (r) => { setSession(r.data.session); await syncQueuedRequests(r.data.session); });
    const sub = sb.auth.onAuthStateChange((_, s) => setSession(s));
    return () => sub.data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let alive = true;
    sb.functions.invoke("public-experience", { body: { action: "news_list" } })
      .then((r) => {
        if (alive && !r.error && r.data?.ok && Array.isArray(r.data.records) && r.data.records.length) {
          setNews(
            r.data.records.map((x: any) => [
              x.category || "DESA",
              x.published_at ? new Date(x.published_at).toLocaleDateString("id-ID") : "",
              x.title || "Kabar Desa",
              x.summary || x.content || "",
            ]),
          );
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function signIn() {
    setBusy(true);
    setError("");
    const r = await sb.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (r.error) setError(r.error.message);
    else {
      setAuth(false);
      setPassword("");
    }
  }

  if (auth) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" />
        <Auth
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          busy={busy}
          error={error}
          back={() => setAuth(false)}
          signIn={signIn}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={s.app}>
        <View style={s.header}>
          <View style={s.brandRow}>
            <View style={s.brandMark}><Text style={s.brandMarkText}>SV</Text></View>
            <View>
              <Text style={s.brand}>SMART VILLAGE</Text>
              <Text style={s.sub}>RT/RW · DESA CERDAS ENGINE</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            style={s.login}
            onPress={async () => {
              if (session) await sb.auth.signOut();
              else setAuth(true);
            }}
          >
            <Text style={s.loginText}>{session ? "Keluar" : "Masuk"}</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {notice ? <Pressable style={s.notice} onPress={() => setNotice("")}><Text style={s.noticeText}>{notice}</Text></Pressable> : null}
          {queueSize > 0 ? <View style={s.queuePill}><Text style={s.queueText}>{queueSize} permohonan menunggu sinkronisasi</Text></View> : null}
          {tab === "home" && <Home setTab={setTab} session={session} />}
          {tab === "services" && <Services session={session} setAuth={setAuth} setQueueSize={setQueueSize} setNotice={setNotice} />}
          {tab === "news" && <News data={news} />}
          {tab === "agenda" && <Agenda open={setDetail} />}
          {tab === "room" && <Room session={session} setAuth={setAuth} />}
        </ScrollView>

        {detail && <Detail item={detail} close={() => setDetail(null)} />}

        <View style={s.nav}>
          <Nav label="Beranda" icon="⌂" active={tab === "home"} go={() => setTab("home")} />
          <Nav label="Layanan" icon="▤" active={tab === "services"} go={() => setTab("services")} />
          <Nav label="Kabar" icon="◉" active={tab === "news"} go={() => setTab("news")} />
          <Nav label="Agenda" icon="◷" active={tab === "agenda"} go={() => setTab("agenda")} />
          <Nav label="Warga" icon="◎" active={tab === "room"} go={() => setTab("room")} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function Home({ setTab, session }: any) {
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam";
  }, []);

  return (
    <View>
      <View style={s.greetingRow}>
        <View>
          <Text style={s.eyebrow}>{greeting}</Text>
          <Text style={s.pageTitle}>{session ? "Ruang warga Anda." : "Ruang warga untuk semua."}</Text>
        </View>
        <View style={s.rolePill}><Text style={s.roleText}>{session ? "WARGA" : "PUBLIK"}</Text></View>
      </View>

      <View style={s.civicPulse}>
        <View style={s.pulseTop}>
          <View>
            <Text style={s.pulseLabel}>WILAYAH</Text>
            <Text style={s.pulseTitle}>{session ? "Akun terhubung" : "Informasi publik"}</Text>
          </View>
          <View style={s.verified}><Text style={s.verifiedDot}>●</Text><Text style={s.verifiedText}>{session ? "AKUN AKTIF" : "TERBUKA"}</Text></View>
        </View>
        <Text style={s.pulseText}>
          {session ? "Fitur pribadi tersedia sesuai peran dan wilayah yang diberikan oleh sistem." : "Jelajahi layanan, kabar, dan agenda tanpa membuat akun."}
        </Text>
        <Pressable style={s.pulseAction} onPress={() => setTab(session ? "room" : "services")}>
          <Text style={s.pulseActionText}>{session ? "Buka ruang warga  →" : "Jelajahi layanan  →"}</Text>
        </Pressable>
      </View>

      <Text style={s.section}>Akses cepat</Text>
      <View style={s.quickGrid}>
        <Quick icon="▤" title="Surat & layanan" note="Administrasi" go={() => setTab("services")} />
        <Quick icon="◌" title="Pengaduan" note="Sampaikan masalah" go={() => setTab("room")} />
        <Quick icon="◷" title="Agenda" note="Kegiatan wilayah" go={() => setTab("agenda")} />
        <Quick icon="◉" title="Kabar" note="Info terbaru" go={() => setTab("news")} />
      </View>

      <View style={s.sectionRow}>
        <Text style={s.sectionSmall}>Yang terbaru</Text>
        <Pressable onPress={() => setTab("news")}><Text style={s.link}>Lihat semua</Text></Pressable>
      </View>
      <Pressable style={s.featureCard} onPress={() => setTab("news")}>
        <View style={s.featureTag}><Text style={s.featureTagText}>KABAR WILAYAH</Text></View>
        <Text style={s.featureTitle}>Satu ruang untuk informasi yang dekat dengan kehidupan warga.</Text>
        <Text style={s.featureText}>Berita, layanan, agenda, dan informasi publik dipisahkan dengan jelas agar mudah ditemukan.</Text>
        <Text style={s.arrowLink}>Buka kabar  →</Text>
      </Pressable>
    </View>
  );
}

function Quick({ icon, title, note, go }: any) {
  return (
    <Pressable style={({ pressed }) => [s.quick, pressed && s.pressed]} onPress={go}>
      <View style={s.quickIcon}><Text style={s.quickIconText}>{icon}</Text></View>
      <Text style={s.quickTitle}>{title}</Text>
      <Text style={s.quickNote}>{note}</Text>
    </Pressable>
  );
}

function Services({ session, setAuth, setQueueSize, setNotice }: any) {
  async function requestService(serviceName: string) {
    if (!session?.user) {
      setAuth(true);
      return;
    }
    const item = {
      serviceName,
      citizenName: session.user.email || "Warga",
      scopeLabel: "MY_SCOPE",
    };
    const r = await sb.from("demo_requests").insert({
      request_number: `MOB-${Date.now()}`,
      citizen_name: item.citizenName,
      service_name: item.serviceName,
      scope_label: item.scopeLabel,
      status: "SUBMITTED",
      classification: "INTERNAL",
    });
    if (r.error) {
      await enqueueRequest(item);
      const count = await queuedCount();
      setQueueSize(count);
      setNotice("Permohonan disimpan di perangkat dan akan dikirim saat koneksi tersedia.");
    } else {
      setNotice("Permohonan berhasil dikirim.");
    }
  }
  return (
    <View>
      <Text style={s.eyebrow}>LAYANAN PUBLIK</Text>
      <Text style={s.pageTitle}>Urusan desa, lebih dekat.</Text>
      <Text style={s.intro}>Informasi publik tetap terbuka. Aksi yang menyentuh data pribadi akan meminta Anda masuk.</Text>
      {services.map((x, i) => (
        <Pressable
          key={x[0]}
          style={({ pressed }) => [s.serviceCard, pressed && s.pressed]}
          onPress={() => x[0] === "Lacak Permohonan" ? setAuth(true) : requestService(x[0])}
        >
          <View style={s.serviceIcon}><Text style={s.serviceIconText}>{x[2]}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.serviceTitle}>{x[0]}</Text>
            <Text style={s.serviceText}>{x[1]}</Text>
            <Text style={s.link}>{x[0] === "Lacak Permohonan" ? "Masuk & lacak  →" : session ? "Ajukan layanan  →" : "Masuk untuk mengajukan  →"}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function News({ data }: any) {
  return (
    <View>
      <Text style={s.eyebrow}>KABAR DESA</Text>
      <Text style={s.pageTitle}>Yang sedang terjadi.</Text>
      <Text style={s.intro}>Informasi publik dari ruang desa dan komunitas.</Text>
      {data.map((x: any[], i: number) => (
        <View key={i} style={s.newsCard}>
          <Text style={s.meta}>{x[0]} · {x[1]}</Text>
          <Text style={s.article}>{x[2]}</Text>
          <Text style={s.text}>{x[3]}</Text>
          <Text style={s.link}>Baca selengkapnya  →</Text>
        </View>
      ))}
    </View>
  );
}

function Agenda({ open }: any) {
  return (
    <View>
      <Text style={s.eyebrow}>AGENDA WARGA</Text>
      <Text style={s.pageTitle}>Yang akan datang, terlihat.</Text>
      <Text style={s.intro}>Kegiatan wilayah dalam format yang cepat dipindai.</Text>
      {agendaDemo.map((x, i) => (
        <Pressable key={i} style={({ pressed }) => [s.agenda, pressed && s.pressed]} onPress={() => open(x)}>
          <View style={s.date}><Text style={s.day}>{x[0]}</Text><Text style={s.month}>{x[1]}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.meta}>{x[2]}</Text>
            <Text style={s.title}>{x[3]}</Text>
            <Text style={s.text}>{x[4]} · {x[5]}</Text>
          </View>
          <Text style={s.arrow}>→</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Room({ session, setAuth }: any) {
  return (
    <View>
      <Text style={s.eyebrow}>RUANG WARGA</Text>
      <Text style={s.pageTitle}>Percakapan yang punya arah.</Text>
      <View style={s.roomHero}>
        <View style={s.roomBadge}><Text style={s.roomBadgeText}>TERHUBUNG</Text></View>
        <Text style={s.roomTitle}>Tanya Desa · Pengumuman · Pengaduan · Komunitas</Text>
        <Text style={s.text}>Ruang komunikasi yang tetap terhubung dengan tata kelola wilayah.</Text>
        <Pressable style={s.primaryButton} onPress={session ? undefined : () => setAuth(true)}>
          <Text style={s.primaryButtonText}>{session ? "Mulai percakapan" : "Masuk untuk berpartisipasi"}</Text>
        </Pressable>
      </View>
      <View style={s.card}>
        <Text style={s.title}>Privasi tetap utama.</Text>
        <Text style={s.text}>Identitas, wilayah, dan kewenangan diproses oleh sistem akses. Aplikasi tidak membuka data pribadi sebagai informasi publik.</Text>
      </View>
    </View>
  );
}

function Detail({ item, close }: any) {
  const x = item;
  return (
    <View style={s.overlay}>
      <View style={s.detail}>
        <Pressable onPress={close}><Text style={s.link}>Tutup ×</Text></Pressable>
        <Text style={[s.eyebrow, { marginTop: 18 }]}>{x[2]}</Text>
        <Text style={s.heroTitle}>{x[3]}</Text>
        <Text style={s.text}>{x[4]} · {x[5]}</Text>
        <View style={s.card}>
          <Text style={s.title}>Tentang agenda</Text>
          <Text style={s.text}>{x[6]}</Text>
          <Text style={[s.text, { marginTop: 10 }]}>Agenda yang dipublikasikan mengikuti tata kelola dan kewenangan wilayah.</Text>
        </View>
      </View>
    </View>
  );
}

function Auth({ email, setEmail, password, setPassword, busy, error, back, signIn }: any) {
  return (
    <View style={s.auth}>
      <View style={s.authMark}><Text style={s.brandMarkText}>SV</Text></View>
      <Text style={s.eyebrow}>RUANG PRIBADI WARGA</Text>
      <Text style={s.heroTitle}>Masuk ke Smart Village.</Text>
      <Text style={s.intro}>Gunakan akun warga yang sudah terdaftar pada sistem wilayah.</Text>
      <TextInput style={s.input} placeholder="Email" placeholderTextColor="#82908A" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={s.input} placeholder="Password" placeholderTextColor="#82908A" secureTextEntry value={password} onChangeText={setPassword} />
      {error ? <Text style={s.error}>{error}</Text> : null}
      <Pressable style={s.primaryButton} onPress={signIn} disabled={busy}>
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryButtonText}>Masuk</Text>}
      </Pressable>
      <Pressable style={s.backButton} onPress={back}><Text style={s.link}>← Kembali ke informasi publik</Text></Pressable>
    </View>
  );
}

function Nav({ label, icon, active, go }: any) {
  return (
    <Pressable accessibilityRole="button" style={s.navItem} onPress={go}>
      <View style={[s.navIconWrap, active && s.navIconActive]}><Text style={[s.navIcon, active && s.active]}>{icon}</Text></View>
      <Text style={[s.navLabel, active && s.active]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F4EE" },
  app: { flex: 1, backgroundColor: "#F6F4EE" },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 13, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brandRow: { flexDirection: "row", alignItems: "center" },
  brandMark: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#16352C", alignItems: "center", justifyContent: "center", marginRight: 9 },
  brandMarkText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },
  brand: { fontSize: 14, fontWeight: "900", letterSpacing: 1.25, color: "#16352C" },
  sub: { fontSize: 8.5, letterSpacing: 0.8, color: "#718079", marginTop: 2 },
  login: { borderWidth: 1, borderColor: "#C9D3CE", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: "#FFFFFF" },
  loginText: { fontWeight: "900", color: "#16352C", fontSize: 12 },
  content: { paddingHorizontal: 20, paddingBottom: 108 },
  greetingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 7, marginBottom: 17 },
  eyebrow: { color: "#4D7467", fontSize: 10, fontWeight: "900", letterSpacing: 1.65, marginBottom: 7 },
  pageTitle: { color: "#16352C", fontSize: 29, lineHeight: 34, fontWeight: "900", maxWidth: "86%" },
  rolePill: { borderRadius: 20, backgroundColor: "#E5EEE9", paddingHorizontal: 10, paddingVertical: 6 },
  roleText: { color: "#356557", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  civicPulse: { backgroundColor: "#16352C", borderRadius: 25, padding: 20, marginBottom: 26 },
  pulseTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  pulseLabel: { color: "#AFC7BD", fontSize: 9, fontWeight: "900", letterSpacing: 1.5, marginBottom: 5 },
  pulseTitle: { color: "#FFFFFF", fontSize: 19, fontWeight: "900" },
  verified: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,.10)", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 14 },
  verifiedDot: { color: "#8BC6B1", fontSize: 9, marginRight: 5 },
  verifiedText: { color: "#D7E7E0", fontSize: 8.5, fontWeight: "900", letterSpacing: 0.8 },
  pulseText: { color: "#C7D5CF", fontSize: 13, lineHeight: 19, marginTop: 13, maxWidth: "94%" },
  pulseAction: { alignSelf: "flex-start", marginTop: 16, backgroundColor: "#E6F0EB", borderRadius: 13, paddingHorizontal: 13, paddingVertical: 10 },
  pulseActionText: { color: "#16352C", fontWeight: "900", fontSize: 12 },
  section: { color: "#16352C", fontSize: 21, fontWeight: "900", marginBottom: 13 },
  sectionSmall: { color: "#16352C", fontSize: 18, fontWeight: "900" },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 25, marginBottom: 12 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  quick: { width: "48.2%", backgroundColor: "#FFFFFF", borderRadius: 18, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: "#E0E6E2", minHeight: 119 },
  quickIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#E7EFEA", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  quickIconText: { color: "#356557", fontSize: 18, fontWeight: "800" },
  quickTitle: { color: "#16352C", fontSize: 14, fontWeight: "900" },
  quickNote: { color: "#74817B", fontSize: 11, marginTop: 4 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  notice: { backgroundColor: "#16352C", borderRadius: 14, padding: 12, marginBottom: 10 },
  noticeText: { color: "#FFFFFF", fontSize: 12, lineHeight: 18, fontWeight: "800" },
  queuePill: { backgroundColor: "#FFF2D8", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10 },
  queueText: { color: "#765A21", fontSize: 11, fontWeight: "800" },
  featureCard: { backgroundColor: "#E7EFEA", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "#D5E1DB" },
  featureTag: { alignSelf: "flex-start", backgroundColor: "#D5E4DD", borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6, marginBottom: 13 },
  featureTagText: { color: "#356557", fontSize: 8.5, fontWeight: "900", letterSpacing: 1.1 },
  featureTitle: { color: "#16352C", fontSize: 19, lineHeight: 25, fontWeight: "900" },
  featureText: { color: "#63736C", fontSize: 13, lineHeight: 19, marginTop: 9 },
  arrowLink: { color: "#356557", fontSize: 12, fontWeight: "900", marginTop: 14 },
  intro: { color: "#687770", fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 18 },
  serviceCard: { backgroundColor: "#FFFFFF", borderRadius: 19, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: "#E0E6E2", flexDirection: "row" },
  serviceIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#E7EFEA", alignItems: "center", justifyContent: "center", marginRight: 13 },
  serviceIconText: { color: "#356557", fontSize: 18, fontWeight: "900" },
  serviceTitle: { color: "#16352C", fontSize: 15, fontWeight: "900", marginBottom: 4 },
  serviceText: { color: "#6C7973", fontSize: 12, lineHeight: 18 },
  link: { color: "#356557", fontWeight: "900", fontSize: 12, marginTop: 9 },
  newsCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 18, marginBottom: 11, borderWidth: 1, borderColor: "#E0E6E2" },
  meta: { color: "#718079", fontSize: 9, fontWeight: "900", letterSpacing: 1.05, marginBottom: 8 },
  article: { color: "#16352C", fontSize: 19, lineHeight: 25, fontWeight: "900", marginBottom: 7 },
  text: { color: "#687770", fontSize: 13, lineHeight: 20 },
  agenda: { backgroundColor: "#FFFFFF", borderRadius: 19, padding: 13, marginBottom: 10, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#E0E6E2" },
  date: { width: 57, height: 62, borderRadius: 15, backgroundColor: "#E7EFEA", alignItems: "center", justifyContent: "center", marginRight: 12 },
  day: { color: "#16352C", fontSize: 22, fontWeight: "900" },
  month: { color: "#4D7467", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  title: { color: "#16352C", fontWeight: "900", fontSize: 15, marginBottom: 5 },
  arrow: { color: "#4D7467", fontSize: 20, marginLeft: 8 },
  roomHero: { backgroundColor: "#16352C", borderRadius: 24, padding: 21, marginTop: 14, marginBottom: 12 },
  roomBadge: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,.11)", borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6, marginBottom: 15 },
  roomBadgeText: { color: "#BFD7CD", fontSize: 8.5, fontWeight: "900", letterSpacing: 1.1 },
  roomTitle: { color: "#FFFFFF", fontSize: 20, lineHeight: 27, fontWeight: "900", marginBottom: 9 },
  primaryButton: { backgroundColor: "#356557", minHeight: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 17, marginTop: 14 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 19, padding: 17, marginBottom: 11, borderWidth: 1, borderColor: "#E0E6E2" },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(22,53,44,.38)", justifyContent: "flex-end" },
  detail: { backgroundColor: "#F6F4EE", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, minHeight: "58%" },
  heroTitle: { color: "#16352C", fontSize: 30, lineHeight: 36, fontWeight: "900" },
  auth: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: "#F6F4EE" },
  authMark: { width: 48, height: 48, borderRadius: 15, backgroundColor: "#16352C", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  input: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DCE4DF", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, marginTop: 10, color: "#16352C", fontSize: 14 },
  error: { color: "#A63D3D", marginTop: 10, fontSize: 12, lineHeight: 18 },
  backButton: { alignItems: "center", marginTop: 18, padding: 8 },
  nav: { position: "absolute", bottom: 0, left: 0, right: 0, height: 84, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E0E6E2", flexDirection: "row", justifyContent: "space-around", paddingTop: 7 },
  navItem: { alignItems: "center", width: "20%" },
  navIconWrap: { width: 37, height: 30, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  navIconActive: { backgroundColor: "#E7EFEA" },
  navIcon: { fontSize: 18, color: "#93A09A" },
  navLabel: { fontSize: 9.5, color: "#7B8882", marginTop: 2, fontWeight: "800" },
  active: { color: "#16352C" },
});
