import "react-native-url-polyfill/auto";
import React, { useEffect, useMemo, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import {
  ActivityIndicator,
  Image,
  Modal,
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
const KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_nSqPHZf1-1CAJMFNmrpNqA_lafobeV-";
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
  const [authMode, setAuthMode] = useState<"signin"|"signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [requestedRole, setRequestedRole] = useState<"WARGA"|"RT"|"RW">("WARGA");
  const [village, setVillage] = useState("Desa Pilot");
  const [rtNumber, setRtNumber] = useState("");
  const [rwNumber, setRwNumber] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [roleCode, setRoleCode] = useState<string|null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<any>(null);
  const [detailType, setDetailType] = useState<"news"|"agenda"|null>(null);
  const [news, setNews] = useState<any[]>(newsDemo.map((x:any[],i:number)=>({id:String(i),category:x[0],date:x[1],title:x[2],summary:x[3],content:x[3],image_url:["https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80"][i]}))));
  const [agenda, setAgenda] = useState<any[]>(agendaDemo);
  const [queueSize, setQueueSize] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    sb.auth.getSession().then(async (r) => { setSession(r.data.session); await loadProfile(r.data.session); await syncQueuedRequests(r.data.session); });
    const sub = sb.auth.onAuthStateChange((_, s) => { setSession(s); loadProfile(s); });
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

  useEffect(() => {
    let alive=true;
    Promise.all([sb.functions.invoke("public-experience",{body:{action:"news_list"}}),sb.functions.invoke("public-experience",{body:{action:"agenda_list"}})]).then(([nr,ar])=>{
      if(!alive)return;
      if(!nr.error&&nr.data?.ok&&nr.data.records?.length)setNews(nr.data.records.map((x:any)=>({id:x.id,category:x.category||"DESA",date:x.published_at?new Date(x.published_at).toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"}).toUpperCase():"",title:x.title||"Kabar Desa",summary:x.summary||x.content||"",content:x.content||x.summary||"",image_url:x.image_url||"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80"})));
      if(!ar.error&&ar.data?.ok&&ar.data.records?.length)setAgenda(ar.data.records.map((x:any)=>{const d=new Date(x.event_date||Date.now());return [String(d.getDate()).padStart(2,"0"),d.toLocaleDateString("id-ID",{month:"short"}).toUpperCase(),x.event_type||"AGENDA",x.title||x.name,x.start_at?new Date(x.start_at).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})+" WIB":"",x.location||"Wilayah",x.description||""];}));
    }).catch(()=>{});
    return()=>{alive=false;};
  },[]);
  useEffect(()=>{setDetail(null);setDetailType(null);},[tab]);

  async function loadProfile(currentSession: Session|null){
    if(!currentSession?.user){setProfile(null);setRoleCode(null);return;}
    const p=await sb.from("citizen_profiles").select("full_name,phone,requested_role,approval_status,village_label,rt_number,rw_number").eq("user_id",currentSession.user.id).maybeSingle();
    if(p.data)setProfile(p.data);
    const r=await sb.from("role_assignments").select("active,roles(role_code)").eq("user_id",currentSession.user.id).eq("active",true).limit(5);
    const codes=(r.data||[]).map((x:any)=>x.roles?.role_code).filter(Boolean);
    const active=codes.find((x:string)=>["RT_OPERATOR","RW_REVIEWER","WARGA"].includes(x));
    setRoleCode(active==="RT_OPERATOR"?"RT":active==="RW_REVIEWER"?"RW":active==="WARGA"?"WARGA":null);
  }

  async function signUp(){
    if(!fullName.trim()||!email.trim()||password.length<6){setError("Nama, email, dan password minimal 6 karakter wajib diisi.");return;}
    if((requestedRole==="RT"||requestedRole==="RW")&&(!rtNumber.trim()||!rwNumber.trim())){setError("Untuk pendaftaran RT/RW, isi nomor RT dan RW terlebih dahulu.");return;}
    setBusy(true);setError("");
    const r=await sb.auth.signUp({email:email.trim(),password,options:{data:{full_name:fullName.trim(),phone:phone.trim(),requested_role:requestedRole,village_label:village.trim(),rt_number:rtNumber.trim(),rw_number:rwNumber.trim()}}});
    setBusy(false);
    if(r.error){setError(r.error.message);return;}
    if(r.data.session){setSession(r.data.session);await loadProfile(r.data.session);setAuth(false);setNotice(requestedRole==="WARGA"?"Pendaftaran warga berhasil. Ruang Warga Anda sudah aktif.":"Pendaftaran diterima. Permintaan peran RT/RW menunggu verifikasi pengelola wilayah.");}
    else{setNotice("Pendaftaran berhasil. Periksa email jika verifikasi email diaktifkan, lalu masuk.");setAuthMode("signin");setPassword("");}
  }

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
    return <SafeAreaView style={s.safe}><StatusBar barStyle="dark-content" /><AuthV2 mode={authMode} setMode={setAuthMode} email={email} setEmail={setEmail} password={password} setPassword={setPassword} fullName={fullName} setFullName={setFullName} phone={phone} setPhone={setPhone} requestedRole={requestedRole} setRequestedRole={setRequestedRole} village={village} setVillage={setVillage} rtNumber={rtNumber} setRtNumber={setRtNumber} rwNumber={rwNumber} setRwNumber={setRwNumber} busy={busy} error={error} back={()=>{setAuth(false);setError("");}} signIn={signIn} signUp={signUp} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={s.app}>
        <View style={s.header}>
          <View style={s.brandRow}>
            <View style={s.brandMark}><Text style={s.brandMarkText}>RT</Text></View>
            <View>
              <Text style={s.brand}>RT/RW-SID CONNECT</Text>
              <Text style={s.sub}>SISTEM INFORMASI RT/RW</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            style={s.login}
            onPress={async () => {
              if (session) { await sb.auth.signOut(); setNotice("Anda sudah keluar."); } else { setAuthMode("signin"); setAuth(true); }
            }}
          >
            <Text style={s.loginText}>{session ? "Keluar" : "Masuk"}</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {notice ? <Pressable style={s.notice} onPress={() => setNotice("")}><Text style={s.noticeText}>{notice}</Text></Pressable> : null}
          {queueSize > 0 ? <View style={s.queuePill}><Text style={s.queueText}>{queueSize} permohonan menunggu sinkronisasi</Text></View> : null}
          {tab === "home" && <HomeV2 setTab={setTab} session={session} roleLabel={roleCode || profile?.requested_role || "PUBLIK"} rolePending={profile?.approval_status === "PENDING_REVIEW"} profile={profile} />}
          {tab === "services" && <Services session={session} setAuth={setAuth} setQueueSize={setQueueSize} setNotice={setNotice} />}
          {tab === "news" && <NewsV2 data={news} open={(x:any)=>{setDetail(x);setDetailType("news");}} />}
          {tab === "agenda" && <AgendaV2 data={agenda} open={(x:any)=>{setDetail(x);setDetailType("agenda");}} />}
          {tab === "room" && <RoomV2 session={session} setAuth={()=>{setAuthMode("signin");setAuth(true);}} roleLabel={roleCode || profile?.requested_role || "PUBLIK"} />}
        </ScrollView>

        <DetailV2 item={detail} type={detailType} close={()=>{setDetail(null);setDetailType(null);}} />

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


async function syncQueuedRequests(currentSession: Session | null) {
  if (!currentSession?.user) {
    return;
  }
  const flushed = await flushQueue(async (item) => {
    const { error } = await sb.from("demo_requests").insert({
      request_number: item.id,
      citizen_name: item.citizenName,
      service_name: item.serviceName,
      scope_label: item.scopeLabel,
      status: "SUBMITTED",
      classification: "INTERNAL",
    });
    return !error;
  });
  if (flushed > 0) {
    await SecureStore.setItemAsync("rt_rw_sid_mobile_queue_notice_v1", String(flushed));
  }
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
      <DataIntakePanel session={session} setAuth={setAuth} setNotice={setNotice} />
    </View>
  );
}

function DataIntakePanel({ session, setAuth, setNotice }: any) {
  async function createBatch(sourceType: string, sourceName: string, fileUri?: string) {
    if (!session?.user) {
      setAuth(true);
      return;
    }
    const scope = await sb.from("role_assignments")
      .select("scope_territory_id")
      .eq("user_id", session.user.id)
      .eq("active", true)
      .not("scope_territory_id", "is", null)
      .limit(1)
      .maybeSingle();
    const territoryId = scope.data?.scope_territory_id;
    if (!territoryId) {
      setNotice("Akun ini belum memiliki wilayah kerja aktif untuk Data Intake.");
      return;
    }

    const r = await sb.from("data_intake_batches").insert({
      territory_id: territoryId,
      source_type: sourceType,
      source_name: sourceName,
      status: "UPLOADED",
      created_by: session.user.id,
    }).select("id").single();
    if (r.error) {
      setNotice("Pusat data belum dapat menerima input saat ini: " + r.error.message);
      return;
    }

    const batchId = String(r.data?.id || "");
    if (sourceType === "CSV" && fileUri && batchId) {
      try {
        const csv = await (await fetch(fileUri)).text();
        const extraction = await sb.functions.invoke("ai-data-intake", {
          body: { batch_id: batchId, source_type: "CSV", content: csv },
        });
        if (extraction.error) {
          setNotice("Batch tersimpan, tetapi ekstraksi CSV belum berhasil: " + extraction.error.message);
          return;
        }
        const d = extraction.data || {};
        setNotice("Batch " + batchId.slice(0, 8) + " diproses: " + String(d.rows || 0) + " baris, " + String(d.matched || 0) + " cocok, " + String(d.review || 0) + " perlu review.");
        return;
      } catch (e: any) {
        setNotice("Batch tersimpan, tetapi file CSV belum dapat dibaca: " + String(e?.message || e));
        return;
      }
    }

    setNotice("Input diterima. Batch " + batchId.slice(0, 8) + " menunggu ekstraksi/provider dan verifikasi operator.");
  }

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/pdf",
        "image/*",
      ],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const name = asset.name || "dokumen";
      const mime = asset.mimeType || "";
      const type = mime.includes("spreadsheet") || mime.includes("excel") ? "EXCEL" : mime.includes("csv") ? "CSV" : mime.includes("pdf") ? "PDF" : "IMAGE";
      await createBatch(type, name, asset.uri);
    }
  }

  async function capturePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setNotice("Izin kamera diperlukan untuk memotret KK/KTP/dokumen.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (!result.canceled && result.assets?.[0]) {
      await createBatch("SCAN", "camera-" + Date.now() + ".jpg");
    }
  }

  return (
    <View style={s.intakeCard}>
      <Text style={s.intakeEyebrow}>DATA INTAKE</Text>
      <Text style={s.intakeTitle}>Masukkan data tanpa mengetik ulang.</Text>
      <Text style={s.intakeText}>CSV sudah dapat diproses untuk mapping, normalisasi, pencocokan NIK/KK, duplicate detection, dan review. PDF, foto, scan, dan Excel menunggu provider/parser yang disetujui.</Text>
      <View style={s.intakeActions}>
        <Pressable style={s.intakeButton} onPress={pickFile}>
          <Text style={s.intakeButtonText}>Pilih file</Text>
        </Pressable>
        <Pressable style={s.intakeButton} onPress={capturePhoto}>
          <Text style={s.intakeButtonText}>Foto / scan</Text>
        </Pressable>
      </View>
      <Text style={s.intakeNote}>AI tidak langsung mengubah data sensitif. Hasil extraction dan matching melewati review sebelum masuk data inti.</Text>
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
      <Text style={s.heroTitle}>Masuk ke RT/RW-SID CONNECT.</Text>
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
  intakeCard: { backgroundColor: "#16352C", borderRadius: 22, padding: 18, marginTop: 12, marginBottom: 14 },
  intakeEyebrow: { color: "#AFC7BD", fontSize: 9, fontWeight: "900", letterSpacing: 1.45, marginBottom: 7 },
  intakeTitle: { color: "#FFFFFF", fontSize: 19, lineHeight: 25, fontWeight: "900" },
  intakeText: { color: "#C7D5CF", fontSize: 12.5, lineHeight: 19, marginTop: 8 },
  intakeActions: { flexDirection: "row", gap: 8, marginTop: 14 },
  intakeButton: { backgroundColor: "#E6F0EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  intakeButtonText: { color: "#16352C", fontSize: 12, fontWeight: "900" },
  intakeNote: { color: "#9FB6AC", fontSize: 10.5, lineHeight: 16, marginTop: 11 },
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
