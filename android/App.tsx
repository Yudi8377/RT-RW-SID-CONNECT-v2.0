import "react-native-url-polyfill/auto";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createClient, Session } from "@supabase/supabase-js";

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://gzdusguveeeflmlvvmwe.supabase.co";
const KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const storage = {
  getItem: (k: string) => SecureStore.getItemAsync(k),
  setItem: (k: string, v: string) => SecureStore.setItemAsync(k, v),
  removeItem: (k: string) => SecureStore.deleteItemAsync(k)
};
const sb = createClient(URL, KEY, { auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });

type Tab = "home" | "services" | "news" | "agenda" | "room";
const newsDemo = [
  ["DESA", "29 SEPTEMBER 2026", "Digitalisasi desa bukan sekadar teknologi.", "Smart Village mempertemukan informasi, pelayanan, komunitas, dan ekonomi lokal."],
  ["EKONOMI", "28 SEPTEMBER 2026", "UMKM lokal menemukan ruang baru untuk tumbuh.", "Pelaku usaha desa mulai memanfaatkan ruang digital untuk memperluas jangkauan."],
  ["KOMUNITAS", "27 SEPTEMBER 2026", "Gotong royong menjadi agenda bersama warga.", "Agenda komunitas terhubung dengan kalender desa agar mudah ditemukan."],
  ["LAYANAN", "26 SEPTEMBER 2026", "Informasi pelayanan desa kini lebih mudah ditemukan.", "Persyaratan dan alur layanan tersedia dalam satu ruang informasi."]
];
const agendaDemo = [
  ["07", "OKT", "RAPAT RT", "Agenda Demo Desa — Oct 2026", "15.00 WIB", "Balai Desa Demo", "Rapat koordinasi RT, pelayanan warga, kebersihan, dan agenda bulan berjalan."],
  ["07", "NOV", "OLAHRAGA", "Agenda Demo Desa — Nov 2026", "15.00 WIB", "Lapangan Warga Demo", "Olahraga warga dan pembinaan komunitas pemuda."],
  ["07", "DES", "GOTONG ROYONG", "Agenda Demo Desa — Dec 2026", "15.00 WIB", "Balai Desa Demo", "Kerja bakti lingkungan dan persiapan fasilitas publik."],
  ["07", "JAN", "RAPAT RT", "Agenda Demo Desa — Jan 2027", "15.00 WIB", "Balai Desa Demo", "Musyawarah awal tahun dan penetapan agenda pelayanan warga."]
];
const services = [
  ["Administrasi Kependudukan", "Persyaratan dan alur layanan kependudukan."],
  ["Pengaduan Warga", "Lingkungan, fasilitas, keamanan, sosial, dan pelayanan."],
  ["Surat & Pelayanan Desa", "Katalog informasi surat sesuai kewenangan."],
  ["Kegiatan RT/RW", "Musyawarah, kerja bakti, sosial, komunitas, dan desa."],
  ["Lacak Permohonan", "Pantau status layanan setelah masuk ke akun."],
  ["Data Publik", "Indikator desa dan informasi agregat yang aman."]
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

  useEffect(() => {
    sb.auth.getSession().then(function(r) { setSession(r.data.session); });
    const sub = sb.auth.onAuthStateChange(function(_, s) { setSession(s); });
    return function() { sub.data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let alive = true;
    sb.functions.invoke("public-experience", { body: { action: "news_list" } }).then(function(r) {
      if (alive && !r.error && r.data && r.data.ok && Array.isArray(r.data.records) && r.data.records.length) {
        setNews(r.data.records.map(function(x: any) {
          return [x.category || "DESA", x.published_at ? new Date(x.published_at).toLocaleDateString("id-ID") : "", x.title || "Kabar Desa", x.summary || x.content || ""];
        }));
      }
    }).catch(function() {});
    return function() { alive = false; };
  }, []);

  async function signIn() {
    setBusy(true); setError("");
    const r = await sb.auth.signInWithPassword({ email: email, password: password });
    setBusy(false);
    if (r.error) setError(r.error.message);
    else { setAuth(false); setPassword(""); }
  }

  if (auth) return <Auth email={email} setEmail={setEmail} password={password} setPassword={setPassword} busy={busy} error={error} back={function(){setAuth(false);}} signIn={signIn} />;

  return <SafeAreaView style={s.safe}>
    <StatusBar barStyle="dark-content" />
    <View style={s.app}>
      <View style={s.header}>
        <View><Text style={s.brand}>SMART VILLAGE</Text><Text style={s.sub}>DESA CERDAS ENGINE</Text></View>
        <Pressable style={s.login} onPress={async function(){ if(session){await sb.auth.signOut();} else setAuth(true); }}>
          <Text style={s.loginText}>{session ? "Keluar" : "Masuk"}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        {tab === "home" && <Home setTab={setTab} session={session} />}
        {tab === "services" && <Services setAuth={setAuth} />}
        {tab === "news" && <News data={news} />}
        {tab === "agenda" && <Agenda open={setDetail} />}
        {tab === "room" && <Room session={session} setAuth={setAuth} />}
      </ScrollView>
      {detail && <Detail item={detail} close={function(){setDetail(null);}} />}
      <View style={s.nav}>
        <Nav label="Beranda" icon="⌂" active={tab==="home"} go={function(){setTab("home");}} />
        <Nav label="Layanan" icon="▣" active={tab==="services"} go={function(){setTab("services");}} />
        <Nav label="Kabar" icon="◉" active={tab==="news"} go={function(){setTab("news");}} />
        <Nav label="Agenda" icon="◷" active={tab==="agenda"} go={function(){setTab("agenda");}} />
        <Nav label="Warga" icon="◎" active={tab==="room"} go={function(){setTab("room");}} />
      </View>
    </View>
  </SafeAreaView>;
}

function Home(p: any) {
  return <View>
    <View style={s.hero}><Text style={s.eyebrow}>CIVIC DIGITAL EXPERIENCE</Text><Text style={s.heroTitle}>Desa yang <Text style={s.italic}>terhubung.</Text>{"\n"}Warga yang <Text style={s.italic}>terlayani.</Text></Text><Text style={s.heroText}>Satu ruang digital untuk layanan desa, informasi publik, kegiatan warga, komunikasi komunitas, dan ekonomi lokal.</Text><View style={s.row}><Button text="Jelajahi layanan" go={function(){p.setTab("services");}}/><Ghost text="Kabar desa" go={function(){p.setTab("news");}}/></View></View>
    <View style={s.card}><Text style={s.title}>{p.session ? "Akun warga terhubung" : "Ruang digital desa"}</Text><Text style={s.text}>{p.session ? "Akun Anda dapat digunakan untuk fitur warga." : "Masuk untuk fitur yang membutuhkan identitas warga."}</Text></View>
    <Text style={s.section}>Akses cepat</Text>
    <View style={s.grid}><Tile text="Layanan" go={function(){p.setTab("services");}}/><Tile text="Kabar Desa" go={function(){p.setTab("news");}}/><Tile text="Agenda Warga" go={function(){p.setTab("agenda");}}/><Tile text="Ruang Warga" go={function(){p.setTab("room");}}/></View>
  </View>;
}
function Services(p: any) {
  return <View><Text style={s.eyebrow}>LAYANAN PUBLIK</Text><Text style={s.section}>Urusan desa, lebih dekat.</Text>{services.map(function(x, i){return <View key={x[0]} style={s.card}><Text style={s.number}>0{i+1}</Text><Text style={s.title}>{x[0]}</Text><Text style={s.text}>{x[1]}</Text><Pressable onPress={x[0]==="Lacak Permohonan" ? function(){p.setAuth(true);} : undefined}><Text style={s.link}>{x[0]==="Lacak Permohonan" ? "Masuk & lacak →" : "Lihat informasi →"}</Text></Pressable></View>;})}</View>;
}
function News(p: any) {
  return <View><Text style={s.eyebrow}>KABAR DESA</Text><Text style={s.section}>Yang sedang terjadi di sekitar kita.</Text>{p.data.map(function(x: any[], i: number){return <View key={i} style={s.card}><Text style={s.meta}>{x[0]} · {x[1]}</Text><Text style={s.article}>{x[2]}</Text><Text style={s.text}>{x[3]}</Text><Text style={s.link}>Baca selengkapnya →</Text></View>;})}</View>;
}
function Agenda(p: any) {
  return <View><Text style={s.eyebrow}>AGENDA WARGA</Text><Text style={s.section}>Yang akan datang, terlihat.</Text>{agendaDemo.map(function(x, i){return <Pressable key={i} style={s.agenda} onPress={function(){p.open(x);}}><View style={s.date}><Text style={s.day}>{x[0]}</Text><Text style={s.month}>{x[1]}</Text></View><View style={{flex:1}}><Text style={s.meta}>{x[2]}</Text><Text style={s.title}>{x[3]}</Text><Text style={s.text}>{x[4]} · {x[5]}</Text></View><Text style={s.arrow}>→</Text></Pressable>;})}</View>;
}
function Room(p: any) {
  return <View><Text style={s.eyebrow}>RUANG WARGA</Text><Text style={s.section}>Percakapan yang punya arah.</Text><View style={s.hero}><Text style={s.title}>Tanya Desa · Pengumuman · Pengaduan · Komunitas</Text><Text style={s.text}>Ruang komunikasi yang tetap terhubung dengan tata kelola desa.</Text><Button text={p.session ? "Mulai percakapan" : "Masuk untuk berpartisipasi"} go={p.session ? function(){} : function(){p.setAuth(true);}} /></View></View>;
}
function Detail(p: any) {
  const x = p.item;
  return <View style={s.overlay}><View style={s.detail}><Pressable onPress={p.close}><Text style={s.link}>Tutup ×</Text></Pressable><Text style={s.eyebrow}>{x[2]}</Text><Text style={s.heroTitle}>{x[3]}</Text><Text style={s.text}>{x[4]} · {x[5]}</Text><View style={s.card}><Text style={s.title}>Tentang agenda</Text><Text style={s.text}>{x[6]}</Text><Text style={s.text}>Agenda berasal dari kegiatan yang ditandai dapat dipublikasikan oleh tata kelola desa.</Text></View></View></View>;
}
function Auth(p: any) {
  return <SafeAreaView style={s.safe}><View style={s.auth}><Pressable onPress={p.back}><Text style={s.link}>← Kembali</Text></Pressable><Text style={s.heroTitle}>Masuk ke Smart Village</Text><Text style={s.text}>Gunakan akun warga yang terdaftar pada sistem desa.</Text><TextInput style={s.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={p.email} onChangeText={p.setEmail}/><TextInput style={s.input} placeholder="Password" secureTextEntry value={p.password} onChangeText={p.setPassword}/>{p.error ? <Text style={s.error}>{p.error}</Text> : null}<Pressable style={s.button} onPress={p.signIn} disabled={p.busy}>{p.busy ? <ActivityIndicator color="#fff"/> : <Text style={s.buttonText}>Masuk</Text>}</Pressable></View></SafeAreaView>;
}
function Button(p: any) { return <Pressable style={s.button} onPress={p.go}><Text style={s.buttonText}>{p.text}</Text></Pressable>; }
function Ghost(p: any) { return <Pressable style={s.ghost} onPress={p.go}><Text style={s.ghostText}>{p.text}</Text></Pressable>; }
function Tile(p: any) { return <Pressable style={s.tile} onPress={p.go}><Text style={s.title}>{p.text}</Text><Text style={s.arrow}>↗</Text></Pressable>; }
function Nav(p: any) { return <Pressable style={s.navItem} onPress={p.go}><Text style={[s.navIcon,p.active&&s.active]}>{p.icon}</Text><Text style={[s.navLabel,p.active&&s.active]}>{p.label}</Text></Pressable>; }

const s = StyleSheet.create({
 safe:{flex:1,backgroundColor:"#f7f5ef"}, app:{flex:1,backgroundColor:"#f7f5ef"}, header:{padding:16,flexDirection:"row",justifyContent:"space-between",alignItems:"center"}, brand:{fontSize:16,fontWeight:"900",letterSpacing:1.4,color:"#18352c"}, sub:{fontSize:9,letterSpacing:1.1,color:"#708078",marginTop:2}, login:{borderWidth:1,borderColor:"#cad3ce",paddingHorizontal:13,paddingVertical:8,borderRadius:18},loginText:{fontWeight:"800",color:"#18352c",fontSize:12},content:{padding:20,paddingBottom:105},hero:{backgroundColor:"#e5eee9",borderRadius:26,padding:23,marginBottom:15},eyebrow:{color:"#527468",fontSize:10,fontWeight:"900",letterSpacing:1.7,marginBottom:7},heroTitle:{color:"#18352c",fontSize:30,lineHeight:37,fontWeight:"900"},italic:{fontStyle:"italic",fontWeight:"500"},heroText:{color:"#60716b",fontSize:14,lineHeight:22,marginTop:13,marginBottom:17},row:{flexDirection:"row",gap:9},button:{backgroundColor:"#18352c",paddingHorizontal:16,paddingVertical:12,borderRadius:14,alignItems:"center",justifyContent:"center",marginTop:12},buttonText:{color:"#fff",fontWeight:"900",fontSize:13},ghost:{borderWidth:1,borderColor:"#9eafa8",paddingHorizontal:16,paddingVertical:12,borderRadius:14,marginTop:12},ghostText:{color:"#18352c",fontWeight:"900",fontSize:13},card:{backgroundColor:"#fff",borderRadius:18,padding:17,marginBottom:11,borderWidth:1,borderColor:"#e4e7e4"},title:{color:"#18352c",fontWeight:"900",fontSize:16,marginBottom:5},text:{color:"#687771",fontSize:13,lineHeight:20},section:{color:"#18352c",fontSize:27,fontWeight:"900",marginBottom:15},grid:{flexDirection:"row",flexWrap:"wrap",gap:10},tile:{width:"48%",minHeight:88,backgroundColor:"#fff",borderRadius:18,padding:16,borderWidth:1,borderColor:"#e4e7e4",justifyContent:"space-between"},arrow:{color:"#527468",fontSize:20,alignSelf:"flex-end"},number:{color:"#9aac9f",fontWeight:"900",fontSize:12,marginBottom:6},link:{color:"#37695b",fontWeight:"900",fontSize:13,marginTop:9},meta:{color:"#708078",fontSize:10,fontWeight:"900",letterSpacing:1.1,marginBottom:7},article:{color:"#18352c",fontSize:20,lineHeight:26,fontWeight:"900",marginBottom:7},agenda:{backgroundColor:"#fff",borderRadius:19,padding:13,marginBottom:10,flexDirection:"row",alignItems:"center",borderWidth:1,borderColor:"#e4e7e4"},date:{width:57,height:62,borderRadius:14,backgroundColor:"#e7efe9",alignItems:"center",justifyContent:"center",marginRight:12},day:{color:"#18352c",fontSize:22,fontWeight:"900"},month:{color:"#527468",fontSize:10,fontWeight:"900"},overlay:{position:"absolute",top:0,left:0,right:0,bottom:0,backgroundColor:"rgba(24,53,44,.35)",justifyContent:"flex-end"},detail:{backgroundColor:"#f7f5ef",borderTopLeftRadius:28,borderTopRightRadius:28,padding:24,minHeight:"58%"},auth:{flex:1,padding:24,justifyContent:"center",backgroundColor:"#f7f5ef"},input:{backgroundColor:"#fff",borderWidth:1,borderColor:"#dce3df",borderRadius:14,padding:14,marginTop:10,color:"#18352c"},error:{color:"#a63d3d",marginTop:10},nav:{position:"absolute",bottom:0,left:0,right:0,height:76,backgroundColor:"#fff",borderTopWidth:1,borderTopColor:"#e1e5e2",flexDirection:"row",justifyContent:"space-around",paddingTop:8},navItem:{alignItems:"center",width:"20%"},navIcon:{fontSize:19,color:"#93a09a"},navLabel:{fontSize:10,color:"#7b8882",marginTop:2,fontWeight:"800"},active:{color:"#18352c"}
});