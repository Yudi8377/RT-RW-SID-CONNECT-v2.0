import "react-native-url-polyfill/auto";
import React, { useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import ChatModule from "./ChatModule";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import { Accelerometer } from "expo-sensors";
import { ActivityIndicator, Alert, Image, Modal, NativeModules, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View, Linking } from "react-native";
import MapView, { Circle, Marker, Polygon, PROVIDER_GOOGLE } from "react-native-maps";
import { createClient, Session } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://gzdusguveeeflmlvvmwe.supabase.co";
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_nSqPHZf1-1CAJMFNmrpNqA_lafobeV-";
const GOOGLE_MAPS_READY = Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY);
const storage = {
  getItem: (k:string) => SecureStore.getItemAsync(k),
  setItem: (k:string,v:string) => SecureStore.setItemAsync(k,v),
  removeItem: (k:string) => SecureStore.deleteItemAsync(k)
};
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth:{storage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false} });

type Role = "WARGA"|"KETUA_RT"|"PENGURUS_RT"|"KETUA_RW"|"PENGURUS_RW";
type Tab = "home"|"map"|"news"|"agenda"|"room";
const ROLES: {code:Role; title:string; note:string}[] = [
  {code:"WARGA",title:"Warga",note:"Layanan pribadi & informasi publik"},
  {code:"KETUA_RT",title:"Ketua RT",note:"Kepemimpinan & verifikasi RT"},
  {code:"PENGURUS_RT",title:"Pengurus RT",note:"Operasional RT sesuai kewenangan"},
  {code:"KETUA_RW",title:"Ketua RW",note:"Koordinasi & review RW"},
  {code:"PENGURUS_RW",title:"Pengurus RW",note:"Operasional RW sesuai kewenangan"}
];
const DEMO_NEWS = [
  {id:"1",category:"DESA",title:"Informasi desa dalam satu ruang digital.",summary:"Kabar, layanan, agenda dan informasi publik terhubung.",image_url:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80"},
  {id:"2",category:"EKONOMI",title:"UMKM lokal menemukan ruang baru untuk tumbuh.",summary:"Informasi komunitas dan kegiatan ekonomi lokal lebih mudah ditemukan.",image_url:"https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80"},
  {id:"3",category:"KOMUNITAS",title:"Gotong royong menjadi agenda bersama.",summary:"Kalender wilayah membantu warga menemukan kegiatan terdekat.",image_url:"https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80"}
];
const DEMO_AGENDA = [
  {id:"1",date:"07 OKT",type:"RAPAT RT",title:"Musyawarah warga bulan Oktober",time:"15.00 WIB",location:"Balai Warga",description:"Koordinasi pelayanan, kebersihan, keamanan dan agenda bulan berjalan."},
  {id:"2",date:"07 NOV",type:"OLAHRAGA",title:"Olahraga bersama warga",time:"15.00 WIB",location:"Lapangan Warga",description:"Kegiatan komunitas dan pembinaan pemuda."}
];
const DEMO_RT = [{id:"rt04",name:"RT 04",color:"#4D8A76",points:[{latitude:-6.402,longitude:106.820},{latitude:-6.402,longitude:106.826},{latitude:-6.407,longitude:106.826},{latitude:-6.407,longitude:106.820}]}];
const DEMO_RW = [{id:"rw02",name:"RW 02",color:"#16352C",points:[{latitude:-6.399,longitude:106.817},{latitude:-6.399,longitude:106.829},{latitude:-6.410,longitude:106.829},{latitude:-6.410,longitude:106.817}]}];

export default function App(){
  const [session,setSession]=useState<Session|null>(null);
  const [profile,setProfile]=useState<any>(null);
  const [role,setRole]=useState<Role|"PENDING"|"PUBLIC">("PUBLIC");
  const [authOpen,setAuthOpen]=useState(false);
  const [authMode,setAuthMode]=useState<"signin"|"signup">("signin");
  const [tab,setTab]=useState<Tab>("home");
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [news,setNews]=useState<any[]>(DEMO_NEWS);
  const [agenda,setAgenda]=useState<any[]>(DEMO_AGENDA);
  const [detail,setDetail]=useState<any>(null);
  const [location,setLocation]=useState<Location.LocationObject|null>(null);
  const [emergency,setEmergency]=useState<any[]>([]);
  const [territories,setTerritories]=useState<any[]>([]);
  const [mapReady,setMapReady]=useState(GOOGLE_MAPS_READY);
  const [contacts,setContacts]=useState<any[]>([]);
  const [aiOpen,setAiOpen]=useState(false);
  const [chatOpen,setChatOpen]=useState(false);
  const [sensorProtection,setSensorProtection]=useState(false);
  const [sensorAlert,setSensorAlert]=useState(false);
  const [aiReply,setAiReply]=useState("Saya siap membantu Anda menemukan ide, layanan, dan langkah berikutnya untuk lingkungan.");
  const [emergencyVoice,setEmergencyVoice]=useState(false);
  const [emergencyRecognizing,setEmergencyRecognizing]=useState(false);
  const [emergencyTranscript,setEmergencyTranscript]=useState("");
  const [emergencyAssessment,setEmergencyAssessment]=useState("");
  const [plan,setPlan]=useState<any>(null);
  const [selectedPlan,setSelectedPlan]=useState<"TRIAL"|"COMMUNITY"|"PRO"|"ENTERPRISE">("TRIAL");
  const emergencyMonitoring = NativeModules.EmergencyMonitoring;

  useEffect(()=>{ sb.auth.getSession().then(async r=>{setSession(r.data.session);await loadIdentity(r.data.session)}); const sub=sb.auth.onAuthStateChange((_,s)=>{setSession(s);loadIdentity(s)}); return()=>sub.data.subscription.unsubscribe(); },[]);
  useEffect(()=>{ loadPublic(); },[]);
  useEffect(()=>{ if(session) loadEmergency(); },[session]);
  useEffect(()=>{ loadTerritories(); loadEmergencyContacts(); },[]);
  useEffect(()=>{ if(session){ sb.rpc("sv_ensure_trial_entitlement",{p_user_id:session.user.id}); loadPlan(); } },[session]);
  useSpeechRecognitionEvent("start",()=>setEmergencyRecognizing(true));
  useSpeechRecognitionEvent("end",()=>setEmergencyRecognizing(false));
  useSpeechRecognitionEvent("result",async (event:any)=>{
    if(!emergencyVoice) return;
    const transcript=String(event.results?.[0]?.transcript||"").trim();
    if(!transcript || event.isFinal===false) return;
    setEmergencyTranscript(transcript);
    setEmergencyRecognizing(false);
    const r=await sb.functions.invoke("ai-companion",{body:{message:"EMERGENCY_ASSESSMENT. Sensor/perangkat mendeteksi kemungkinan insiden. Jawaban korban: "+transcript+". Analisis apakah korban kemungkinan membutuhkan bantuan segera. Jika ambigu, utamakan pemeriksaan manusia.",role:"WARGA"}});
    const reply=String(r.data?.reply||"Saya mendengar jawaban Anda. Apakah Anda membutuhkan bantuan sekarang?");
    const needHelp=Boolean(r.data?.emergency_need_help);
    setEmergencyAssessment(reply);
    void speakIndonesian(reply,0.9,()=>{ if(needHelp){ setTimeout(()=>triggerEmergency("VOICE_AI",0.9),250); } });
  });
  useEffect(()=>{
    if(!session || !sensorProtection){
      if(emergencyMonitoring?.stop) void emergencyMonitoring.stop();
      return;
    }
    if(emergencyMonitoring?.start) void emergencyMonitoring.start().catch((e:any)=>Alert.alert("Perlindungan latar belakang gagal",String(e?.message||e)));
    let last=0;
    Accelerometer.setUpdateInterval(120);
    const sub=Accelerometer.addListener(async ({x,y,z})=>{ const g=Math.sqrt(x*x+y*y+z*z); if(g>3.0 && Date.now()-last>30000){last=Date.now();setSensorAlert(true);} });
    return()=>{ sub.remove(); if(emergencyMonitoring?.stop) void emergencyMonitoring.stop(); };
  },[session,sensorProtection]);

  async function loadIdentity(s:Session|null){
    if(!s){setProfile(null);setRole("PUBLIC");return;}
    const p=await sb.from("citizen_profiles").select("*").eq("user_id",s.user.id).maybeSingle();
    if(p.data?.avatar_url){ const signed=await sb.storage.from("sv-profile-avatars").createSignedUrl(p.data.avatar_url,3600); if(!signed.error&&signed.data?.signedUrl) p.data.avatar_display_url=signed.data.signedUrl; }
    setProfile(p.data||null);
    const r=await sb.from("role_assignments").select("active,roles(role_code)").eq("user_id",s.user.id).eq("active",true).limit(10);
    const codes=(r.data||[]).map((x:any)=>x.roles?.role_code).filter(Boolean);
    const normalized = codes.map((x:string)=>x==="RT_OPERATOR"?"PENGURUS_RT":x==="RW_REVIEWER"?"PENGURUS_RW":x).filter((x:string): x is Role => ROLES.some(y=>y.code===x));
    const mapped:Role|undefined=normalized[0] as Role|undefined;
    if(mapped){setRole(mapped);return;}
    setRole(p.data?.approval_status==="PENDING_REVIEW"?"PENDING":"WARGA");
  }
  async function loadPublic(){
    const [n,a]=await Promise.all([sb.functions.invoke("public-experience",{body:{action:"news_list"}}),sb.functions.invoke("public-experience",{body:{action:"agenda_list"}})]);
    if(!n.error&&n.data?.records?.length) setNews(n.data.records.map((x:any)=>({...x,image_url:x.image_url||DEMO_NEWS[0].image_url,summary:x.summary||x.content||"",content:x.content||x.summary||""})));
    if(!a.error&&a.data?.records?.length) setAgenda(a.data.records.map((x:any)=>({id:x.id,date:x.event_date?new Date(x.event_date).toLocaleDateString("id-ID",{day:"2-digit",month:"short"}).toUpperCase():"",type:x.event_type||"AGENDA",title:x.title||x.name,time:x.start_at?new Date(x.start_at).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})+" WIB":"",location:x.location||"Wilayah",description:x.description||""})));
  }
  async function loadTerritories(){
    const r=await sb.rpc("sv_public_map_territories");
    if(!r.error && Array.isArray(r.data)) setTerritories(r.data);
  }
  async function loadPlan(){ const r=await sb.from("sv_account_entitlements").select("plan_code,status,expires_at,next_renewal_at,source").eq("user_id",session?.user.id).maybeSingle(); if(!r.error) setPlan(r.data||null); }
  async function loadEmergencyContacts(){
    const r=await sb.from("sv_emergency_contacts").select("id,category,name,phone,whatsapp,address").eq("active",true).order("priority",{ascending:true});
    if(!r.error) setContacts(r.data||[]);
  }
  async function askCompanion(message:string){
    setAiOpen(true);
    const r=await sb.functions.invoke("ai-companion",{body:{message,role:role==="PUBLIC"?"WARGA":role}});
    const reply=r.error?"Saya belum dapat terhubung ke mesin AI. Namun saya bisa tetap membantu Anda dengan menu layanan dan saran yang tersedia.":String(r.data?.reply||"Mari kita mulai dari satu ide kecil yang bisa berdampak bagi lingkungan.");
    setAiReply(reply);
    if(r.data?.voice!==false) void speakIndonesian(reply);
  }
  async function loadEmergency(){
    const r=await sb.from("sv_emergency_events").select("id,latitude,longitude,category,status,expires_at,created_at").eq("requester_user_id",session?.user.id).order("created_at",{ascending:false}).limit(10);
    if(!r.error) setEmergency(r.data||[]);
  }
  async function signOut(){await sb.auth.signOut();setNotice("Anda sudah keluar.");setTab("home");}
  async function changeAvatar(){
    if(!session) return;
    const perm=await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!perm.granted){Alert.alert("Foto profil","Izinkan akses foto untuk memilih foto profil.");return;}
    const pick=await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"] as any,allowsEditing:true,aspect:[1,1],quality:.85});
    if(pick.canceled||!pick.assets?.[0]) return;
    const asset=pick.assets[0]; setBusy(true);
    try{
      const ext=(asset.fileName?.split(".").pop()||"jpg").toLowerCase();
      const path=session.user.id+"/avatar."+ext;
      const bytes=await (await fetch(asset.uri)).arrayBuffer();
      const up=await sb.storage.from("sv-profile-avatars").upload(path,bytes,{contentType:asset.mimeType||"image/jpeg",upsert:true});
      if(up.error) throw up.error;
      const signed=await sb.storage.from("sv-profile-avatars").createSignedUrl(path,3600);
      if(signed.error||!signed.data?.signedUrl) throw signed.error||new Error("URL foto profil privat gagal dibuat");
      const displayUrl=signed.data.signedUrl;
      const u=await sb.from("citizen_profiles").update({avatar_url:path,avatar_visibility:"RT_RW"}).eq("user_id",session.user.id);
      if(u.error) throw u.error;
      setProfile((p:any)=>({...p,avatar_url:path,avatar_display_url:displayUrl,avatar_visibility:"RT_RW"}));setNotice("Foto profil diperbarui.");
    }catch(e:any){setNotice("Foto profil gagal disimpan: "+String(e?.message||e));}finally{setBusy(false);}
  }
  async function startEmergencyVoiceAssessment(){
    setSensorAlert(false);
    setEmergencyVoice(true);
    setEmergencyTranscript("");
    setEmergencyAssessment("");
    const question="Saya mendeteksi kemungkinan kejadian darurat. Apakah Anda terluka atau membutuhkan bantuan sekarang? Tolong jawab dengan suara: ya atau tidak.";
    Speech.stop();
    void speakIndonesian(question,0.9,()=>{ void (async()=>{
      try{
        const p=await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if(!p.granted){ setEmergencyVoice(false); Alert.alert("Mikrofon diperlukan","Izinkan mikrofon dan pengenalan suara agar AI dapat menanyakan kondisi Anda tanpa mengetik."); return; }
        ExpoSpeechRecognitionModule.start({lang:"id-ID",interimResults:false,continuous:false});
      }catch(e){ setEmergencyVoice(false); Alert.alert("Voice AI tidak tersedia","Perangkat belum menyediakan layanan pengenalan suara. Anda tetap dapat mengirim bantuan dengan tombol darurat."); }
      })();
    });
  }
  async function triggerEmergency(source="MANUAL",confidence=1){
    if(!session){setAuthMode("signin");setAuthOpen(true);return;}
    const permission=await Location.requestForegroundPermissionsAsync();
    if(permission.status!=="granted"){Alert.alert("Izin lokasi diperlukan","Lokasi hanya digunakan setelah Anda menyetujui izin untuk bantuan darurat.");return;}
    const pos=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});
    const expires=new Date(Date.now()+30*60*1000).toISOString();
    const r:any=await sb.from("sv_emergency_events").insert({requester_user_id:session.user.id,latitude:pos.coords.latitude,longitude:pos.coords.longitude,category:"GENERAL",message:source==="SENSOR"?"Kemungkinan insiden terdeteksi sensor gerak; dikonfirmasi pengguna.":"Permintaan bantuan darurat warga",expires_at:expires,detection_source:source,confidence,alert_deadline_at:new Date(Date.now()+2*60*1000).toISOString()}).select("id").single();
    if(r.error){setNotice("Permintaan darurat gagal dikirim: "+r.error.message);return;}
    if(source==="SENSOR" && r.data?.[0]?.id){ await sb.from("sv_emergency_sensor_events").insert({emergency_event_id:r.data[0].id,user_id:session.user.id,sensor_type:"ACCELEROMETER",confidence,evidence:{threshold_g:3.0}}); }
    await loadEmergency();setNotice("Bantuan darurat dikirim. Lokasi aktif selama 30 menit.");
  }

  if(!session && !authOpen) return <Landing openAuth={(m:any,p:any)=>{setAuthMode(m);setAuthOpen(true);setSelectedPlan(p||"TRIAL")}} />;
  return <SafeAreaView style={s.safe}><StatusBar barStyle="dark-content"/><View style={s.app}>
    <Header session={session} profile={profile} onAuth={()=>session?signOut():(setAuthMode("signin"),setAuthOpen(true))} onChat={()=>setChatOpen(true)}/>
    {notice?<Pressable style={s.notice} onPress={()=>setNotice("")}><Text style={s.noticeText}>{notice}</Text></Pressable>:null}
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {tab==="home"&&<Home profile={profile} role={role} setTab={setTab} onAvatar={changeAvatar} onChat={()=>setChatOpen(true)} emergency={triggerEmergency} contacts={contacts} askCompanion={askCompanion} sensorProtection={sensorProtection} setSensorProtection={setSensorProtection} plan={plan}/>}
      {tab==="map"&&<GIS location={location} setLocation={setLocation} emergency={triggerEmergency} mapReady={mapReady} setMapReady={setMapReady} territories={territories}/>}
      {tab==="news"&&<News data={news} open={setDetail}/>}
      {tab==="agenda"&&<Agenda data={agenda} open={setDetail}/>}
      {tab==="room"&&<RoleRoom role={role} profile={profile} emergency={triggerEmergency}/>}
    </ScrollView>
    <Nav tab={tab} setTab={setTab}/>
    <Modal visible={!!detail} transparent animationType="slide" onRequestClose={()=>setDetail(null)}><View style={s.backdrop}><View style={s.sheet}><ScrollView contentContainerStyle={s.sheetContent}>{detail?.image_url?<Image source={{uri:detail.image_url}} style={s.detailImage}/>:null}<Pressable onPress={()=>setDetail(null)} style={s.close}><Text style={s.link}>Tutup ×</Text></Pressable><Text style={s.eyebrow}>{detail?.category||detail?.type}</Text><Text style={s.heroTitle}>{detail?.title}</Text><Text style={s.text}>{detail?.content||detail?.description||detail?.summary}</Text>{detail?.location?<View style={s.card}><Text style={s.title}>{detail.time} · {detail.location}</Text><Text style={s.text}>{detail.description}</Text></View>:null}</ScrollView></View></View></Modal>
    <AuthModal visible={authOpen} mode={authMode} setMode={setAuthMode} selectedPlan={selectedPlan} close={()=>setAuthOpen(false)} onNotice={setNotice}/><Modal visible={aiOpen} transparent animationType="slide" onRequestClose={()=>setAiOpen(false)}><View style={s.backdrop}><View style={s.aiSheet}><View style={s.aiOrb}><Text style={s.aiOrbText}>AI</Text></View><Text style={s.eyebrow}>AI COMPANION · {role}</Text><Text style={s.heroTitle}>Teman yang menggerakkan partisipasi.</Text><Text style={s.aiReply}>{aiReply}</Text><TextInput style={s.input} placeholder="Ceritakan ide, masalah, atau kebutuhan Anda…" onSubmitEditing={e=>askCompanion(e.nativeEvent.text)}/><View style={s.row}><Pressable style={[s.secondaryButton,{flex:1}]} onPress={()=>void speakIndonesian(aiReply)}><Text style={s.secondaryButtonText}>🔊 Dengarkan</Text></Pressable><Pressable style={[s.primaryButton,{flex:1}]} onPress={()=>setAiOpen(false)}><Text style={s.primaryButtonText}>Selesai</Text></Pressable></View></View></View></Modal><Modal visible={sensorAlert} transparent animationType="fade" onRequestClose={()=>setSensorAlert(false)}><View style={s.backdrop}><View style={s.aiSheet}><Text style={s.emergencyTitle}>PERLINDUNGAN DARURAT</Text><Text style={s.heroTitle}>Gerakan kuat terdeteksi.</Text><Text style={s.text}>Sensor perangkat mendeteksi pola guncangan yang tidak biasa. Ini bukan diagnosis kecelakaan. Jika Anda membutuhkan pertolongan, kirim lokasi darurat sekarang.</Text><Pressable style={s.emergencyButton} onPress={()=>startEmergencyVoiceAssessment()}><Text style={s.emergencyButtonText}>🎙 TANYA KONDISI DENGAN SUARA</Text></Pressable><Pressable style={s.emergencyButton} onPress={()=>{setSensorAlert(false);triggerEmergency("SENSOR",0.75)}}><Text style={s.emergencyButtonText}>KIRIM BANTUAN SEKARANG</Text></Pressable><Pressable style={s.secondaryButton} onPress={()=>setSensorAlert(false)}><Text style={s.secondaryButtonText}>Saya aman</Text></Pressable></View></View></Modal>
    <Modal visible={emergencyVoice} transparent animationType="fade" onRequestClose={()=>{ExpoSpeechRecognitionModule.stop();setEmergencyVoice(false)}}><View style={s.backdrop}><View style={s.aiSheet}><View style={s.aiOrb}><Text style={s.aiOrbText}>🎙</Text></View><Text style={s.emergencyTitle}>VOICE EMERGENCY AI</Text><Text style={s.heroTitle}>{emergencyRecognizing?"Saya sedang mendengarkan…":"Pemeriksaan kondisi"}</Text><Text style={s.text}>{emergencyRecognizing?"Jawab dengan suara. Tidak perlu mengetik.":"AI akan menilai jawaban Anda dan menentukan langkah berikutnya."}</Text>{emergencyTranscript?<View style={s.card}><Text style={s.meta}>JAWABAN TERDENGAR</Text><Text style={s.text}>{emergencyTranscript}</Text></View>:null}{emergencyAssessment?<Text style={s.aiReply}>{emergencyAssessment}</Text>:null}<View style={s.row}><Pressable style={[s.emergencyButton,{flex:1}]} onPress={()=>{ExpoSpeechRecognitionModule.stop();setEmergencyVoice(false);triggerEmergency("VOICE_MANUAL",1)}}><Text style={s.emergencyButtonText}>KIRIM BANTUAN</Text></Pressable><Pressable style={[s.secondaryButton,{flex:1}]} onPress={()=>{ExpoSpeechRecognitionModule.stop();setEmergencyVoice(false);Speech.stop()}}><Text style={s.secondaryButtonText}>Saya aman</Text></Pressable></View></View></View></Modal>
  <ChatModule visible={chatOpen} onClose={()=>setChatOpen(false)} sb={sb} session={session} profile={profile}/></View></SafeAreaView>;
}

function Landing({openAuth}:any){
 const plans=[
  ["TRIAL","Trial","Gratis · 7 hari","Coba alur aplikasi dan layanan inti."],
  ["COMMUNITY","Community","Dukungan/donasi RT/RW · Rp250.000/bulan","Untuk operasional komunitas; layanan warga inti tetap terbuka."],
  ["PRO","Pro","Langganan · sesuai paket","Fitur operasional, AI dan analitik yang lebih lengkap."],
  ["ENTERPRISE","Enterprise","Kontrak · sesuai kebutuhan","Integrasi, tata kelola dan dukungan organisasi."]
 ];
 return <SafeAreaView style={s.safe}><StatusBar barStyle="light-content"/><ScrollView contentContainerStyle={s.landing}>
  <View style={s.landingBadge}>SMART VILLAGE</View><Text style={s.landingTitle}>RT/RW · DESA CERDAS ENGINE</Text><Text style={s.landingText}>Satu ruang digital untuk warga, RT, RW dan pemerintahan desa.</Text>
  <View style={s.landingMap}><Text style={s.mapGlyph}>⌖</Text><Text style={s.mapTitle}>Wilayah terhubung</Text><Text style={s.mapText}>Warga · RT/RW · GIS · usaha · organisasi · NUSA CHAT · layanan</Text></View>
  <Text style={s.landingPlanTitle}>Pilih akses awal</Text><Text style={s.landingPlanHint}>Pilihan paket hanya menentukan jalur akses/permintaan. Aktivasi Community, Pro dan Enterprise tetap melalui proses resmi.</Text>
  {plans.map(([code,title,price,note])=><Pressable key={code} style={[s.landingPlan,selectedPlanStyle(code)]} onPress={()=>openAuth("signup",code)}><View style={{flex:1}}><Text style={s.landingPlanName}>{title}</Text><Text style={s.landingPlanPrice}>{price}</Text><Text style={s.landingPlanNote}>{note}</Text></View><Text style={s.landingPlanArrow}>›</Text></Pressable>)}
  <View style={s.row}><Pressable style={[s.landingPrimary,s.half]} onPress={()=>openAuth("signin","TRIAL")}><Text style={s.landingPrimaryText}>Masuk</Text></Pressable><Pressable style={[s.landingSecondary,s.half]} onPress={()=>openAuth("signup","TRIAL")}><Text style={s.landingSecondaryText}>Daftar</Text></Pressable></View>
  <Text style={s.landingFoot}>Data pribadi, kewenangan wilayah, privasi dan keamanan percakapan mengikuti role serta kebijakan akses yang terverifikasi.</Text>
 </ScrollView></SafeAreaView>}
function selectedPlanStyle(code:string){return code==="TRIAL"?s.landingPlanActive:null}

async function speakIndonesian(text:string,rate=0.94,onDone?:()=>void){
 try{
  const voices=await Speech.getAvailableVoicesAsync();
  const idVoice=(voices||[]).find((v:any)=>String(v.language||"").toLowerCase().startsWith("id") && /indones|bahasa|id[-_]?id/i.test(String(v.name||"")+" "+String(v.identifier||"")));
  Speech.stop();
  Speech.speak(text,{language:"id-ID",voice:idVoice?.identifier,rate,pitch:1.0,onDone});
 }catch{Speech.speak(text,{language:"id-ID",rate,pitch:1.0,onDone});}
}
function Header({session,profile,onAuth,onChat}:any){return <View style={s.header}><View style={s.brandRow}><Pressable onPress={session?onChat:undefined} style={s.headerAvatar}>{(profile?.avatar_display_url||profile?.avatar_url)?<Image source={{uri:profile.avatar_display_url||profile.avatar_url}} style={s.headerAvatarImage}/>:<Text style={s.headerAvatarText}>{session?(profile?.full_name||"W").slice(0,1).toUpperCase():"SV"}</Text>}</Pressable><View><Text style={s.brand}>SMART VILLAGE</Text><Text style={s.sub}>RT/RW-SID CONNECT</Text></View></View><View style={s.headerActions}>{session?<Pressable style={s.chatMini} onPress={onChat}><Text style={s.chatMiniText}>💬</Text></Pressable>:null}<Pressable style={s.login} onPress={onAuth}><Text style={s.loginText}>{session?"Keluar":"Masuk"}</Text></Pressable></View></View>}

function Home({profile,role,setTab,emergency,contacts,askCompanion,sensorProtection,setSensorProtection,plan,onAvatar,onChat}:any){
  const title=role==="PENDING"?"Pendaftaran sedang diverifikasi":role==="WARGA"?"Ruang warga Anda.":role==="KETUA_RT"||role==="PENGURUS_RT"?"Ruang RT Anda.":role==="KETUA_RW"||role==="PENGURUS_RW"?"Ruang RW Anda.":"Ruang Smart Village.";
  return <View><Text style={s.eyebrow}>{profile?.village_label||"SMART VILLAGE"}</Text><View style={s.greeting}><View style={{flex:1}}><Text style={s.pageTitle}>{title}</Text><Text style={s.text}>{profile?.full_name||"Selamat datang"}</Text></View><View style={s.rolePill}><Text style={s.roleText}>{role}</Text></View></View>
  {role==="WARGA"?<View style={s.profileCard}><Pressable onPress={onAvatar} style={s.profileAvatar}>{profile?.avatar_display_url?<Image source={{uri:profile.avatar_display_url}} style={s.profileAvatarImage}/>:<Text style={s.profileAvatarText}>{(profile?.full_name||"W").slice(0,1).toUpperCase()}</Text>}</Pressable><View style={{flex:1}}><Text style={s.meta}>PROFIL WARGA</Text><Text style={s.profileName}>{profile?.full_name||"Warga"}</Text><Text style={s.text}>RT {profile?.rt_number||"—"} · RW {profile?.rw_number||"—"}</Text><Text style={s.caption}>Foto profil membantu warga saling mengenali. Atur visibilitas di pengaturan privasi.</Text></View><Pressable onPress={onAvatar}><Text style={s.link}>Ubah</Text></Pressable></View>:null}
  <Pressable style={s.chatHero} onPress={onChat}><View style={s.chatHeroIcon}><Text>💬</Text></View><View style={{flex:1}}><Text style={s.chatHeroTitle}>NUSA CHAT</Text><Text style={s.text}>Percakapan warga dengan enkripsi ujung-ke-ujung.</Text></View><Text style={s.chatArrow}>→</Text></Pressable>
  {role==="PENDING"?<View style={s.pending}><Text style={s.title}>Hak khusus belum aktif</Text><Text style={s.text}>Permintaan {profile?.requested_role||"RT/RW"} menunggu verifikasi pengelola wilayah.</Text></View>:null}
  <View style={s.hero}><Text style={s.heroEyebrow}>WILAYAH SAYA</Text><Text style={s.heroText}>RT {profile?.rt_number||"—"} · RW {profile?.rw_number||"—"}</Text><Text style={s.heroSub}>Lihat batas wilayah, fasilitas dan titik layanan.</Text><Pressable style={s.heroButton} onPress={()=>setTab("map")}><Text style={s.heroButtonText}>Buka peta wilayah →</Text></Pressable></View>
  <View style={s.aiCard}><View style={s.aiOrb}><Text style={s.aiOrbText}>AI</Text></View><View style={{flex:1}}><Text style={s.aiTitle}>AI Companion aktif</Text><Text style={s.text}>{role==="WARGA"?"Punya ide untuk lingkungan? Ceritakan. Saya bantu mengubahnya menjadi langkah nyata.":"Saya membantu pekerjaan Anda sesuai role dan wilayah yang terverifikasi."}</Text></View><Pressable style={s.aiButton} onPress={()=>askCompanion(role==="WARGA"?"Berikan saya satu pertanyaan yang membuat saya lebih aktif berkontribusi untuk lingkungan.":"Beri saya satu saran prioritas untuk pekerjaan saya hari ini.")}><Text style={s.aiButtonText}>Mulai</Text></Pressable></View>
  <View style={s.planCard}><Text style={s.meta}>AKSES LAYANAN</Text><Text style={s.planTitle}>{plan?.plan_code||"TRIAL"}</Text><Text style={s.text}>{plan?.plan_code==="TRIAL"?"Trial 7 hari untuk mencoba alur aplikasi. Layanan warga inti tidak dikunci.":"Status "+String(plan?.status||"ACTIVE").toLowerCase()+" · "+(plan?.source||"TRIAL")}</Text><Text style={s.caption}>Model Community menggunakan dukungan/donasi per RT/RW; Pro dan Enterprise dapat menjadi langganan/kontrak. Ini tidak memblokir layanan dasar warga.</Text></View><Text style={s.section}>Contoh data wilayah</Text><View style={s.demoStrip}><View style={s.demoStat}><Text style={s.demoNumber}>24</Text><Text style={s.demoLabel}>Warga contoh</Text></View><View style={s.demoStat}><Text style={s.demoNumber}>2</Text><Text style={s.demoLabel}>RT contoh</Text></View><View style={s.demoStat}><Text style={s.demoNumber}>5</Text><Text style={s.demoLabel}>Organisasi</Text></View><View style={s.demoStat}><Text style={s.demoNumber}>4</Text><Text style={s.demoLabel}>Usaha lokal</Text></View></View><View style={s.card}><Text style={s.title}>Anggota NUSA CHAT · contoh</Text><Text style={s.text}>Budi · Siti · Rizky · Maya</Text><Text style={s.caption}>Nama di atas adalah data contoh, bukan data warga nyata. Akun chat nyata hanya muncul setelah perangkat dan kunci enkripsi terdaftar.</Text></View><Text style={s.section}>Akses cepat</Text><View style={s.grid}><Quick title="Peta GIS" icon="⌖" go={()=>setTab("map")}/><Quick title="Kabar Desa" icon="◉" go={()=>setTab("news")}/><Quick title="Agenda" icon="◷" go={()=>setTab("agenda")}/><Quick title="Ruang Saya" icon="◎" go={()=>setTab("room")}/></View>
  <View style={s.helpCard}><Text style={s.section}>Bantuan & kontak penting</Text><Text style={s.text}>Nomor bantuan diambil dari database RT/RW CONNECT dan dapat dikelola sesuai wilayah.</Text>{contacts.length?contacts.slice(0,6).map((x:any)=><View key={x.id} style={s.contactRow}><View style={{flex:1}}><Text style={s.title}>{x.name}</Text><Text style={s.text}>{x.category} · {x.phone}</Text></View><Pressable style={s.callButton} onPress={()=>Linking.openURL("tel:"+String(x.phone).replace(/\s+/g,""))}><Text style={s.callText}>☎</Text></Pressable></View>):<Text style={s.caption}>Kontak desa belum diisi. Operator dapat menambahkan ambulans, RS, PMI, pemadam, polisi, BPBD, RT dan RW.</Text>}</View>
  <View style={s.emergency}><Text style={s.emergencyTitle}>BANTUAN DARURAT PRIORITAS TINGGI</Text><Text style={s.emergencyText}>Kirim lokasi dengan izin Anda. Untuk perlindungan sensor, aplikasi hanya membuat peringatan dugaan dan meminta konfirmasi—bukan diagnosis kecelakaan.</Text><Pressable style={s.emergencyButton} onPress={()=>emergency()}><Text style={s.emergencyButtonText}>KIRIM LOKASI DARURAT</Text></Pressable><Pressable style={s.sensorToggle} onPress={()=>setSensorProtection(!sensorProtection)}><Text style={s.sensorToggleText}>{sensorProtection?"● Perlindungan sensor AKTIF":"○ Aktifkan perlindungan sensor"}</Text></Pressable></View>
  </View>
}
function Quick({title,icon,go}:any){return <Pressable style={s.quick} onPress={go}><Text style={s.quickIcon}>{icon}</Text><Text style={s.quickTitle}>{title}</Text></Pressable>}
function GIS({location,setLocation,emergency,mapReady,setMapReady,territories}:any){
 const center=location?{latitude:location.coords.latitude,longitude:location.coords.longitude}:{latitude:territories.find((t:any)=>t.center_lat)?.center_lat||-6.4045,longitude:territories.find((t:any)=>t.center_lng)?.center_lng||106.823};
 const getRings=(t:any)=>{const g=t.geojson;return g?.type==="MultiPolygon"?((g.coordinates?.[0]?.[0]||[]).map((p:any)=>({latitude:p[1],longitude:p[0]}))):((g?.coordinates?.[0]||[]).map((p:any)=>({latitude:p[1],longitude:p[0]})));};
 return <View><Text style={s.eyebrow}>GIS WILAYAH</Text><Text style={s.pageTitle}>RT/RW di peta.</Text><Text style={s.intro}>Batas RT/RW, fasilitas dan lokasi darurat ditampilkan sesuai kewenangan.</Text>
 {!mapReady?<View style={s.mapNotice}><Text style={s.title}>Mode GIS aman</Text><Text style={s.text}>Peta interaktif Google belum tersedia pada build ini, jadi aplikasi memakai tampilan GIS lokal agar menu tidak tertutup. Data batas wilayah tetap dapat ditinjau di bawah.</Text></View>:null}
 {mapReady?<MapView provider={PROVIDER_GOOGLE} style={s.map} initialRegion={{...center,latitudeDelta:.018,longitudeDelta:.018}} showsUserLocation={Boolean(location)} showsMyLocationButton={true} onMapReady={()=>setMapReady(true)}>{territories.map((t:any)=>{const rings=getRings(t);return rings.length>2?<Polygon key={t.id} coordinates={rings} fillColor={t.level==="RT"?"rgba(77,138,118,.20)":"rgba(22,53,44,.10)"} strokeColor={t.level==="RT"?"#4D8A76":"#16352C"} strokeWidth={2}/>:null;})}<Marker coordinate={center} title="Pusat peta wilayah"/>{location?<Circle center={center} radius={35} fillColor="rgba(53,101,87,.15)" strokeColor="#356557"/>:null}</MapView>:<View style={s.gisCanvas}><View style={s.gisGrid}>{Array.from({length:20}).map((_,i)=><View key={i} style={s.gisGridCell}/>)}</View><View style={s.gisRoadOne}/><View style={s.gisRoadTwo}/>{territories.map((t:any,i:number)=><View key={t.id||i} style={i%2?s.gisZoneTwo:s.gisZoneOne}><Text style={s.gisZoneText}>{t.level||"RT"} · {t.name}</Text></View>)}<View style={s.gisPin}><Text style={s.gisPinText}>⌖</Text></View></View>}
 <View style={s.mapActions}><Pressable style={s.secondaryButton} onPress={async()=>{const p=await Location.requestForegroundPermissionsAsync();if(p.status!=="granted"){Alert.alert("Izin lokasi ditolak");return;}setLocation(await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced}));}}><Text style={s.secondaryButtonText}>Lokasi saya</Text></Pressable><Pressable style={s.primaryButton} onPress={emergency}><Text style={s.primaryButtonText}>Emergency</Text></Pressable></View>
 <Text style={s.section}>Data wilayah</Text>{territories.length?territories.map((t:any)=><View key={t.id} style={s.territoryCard}><Text style={s.title}>{t.level} · {t.name}</Text><Text style={s.text}>Kode {t.code} · titik pusat {Number(t.center_lat||center.latitude).toFixed(5)}, {Number(t.center_lng||center.longitude).toFixed(5)}</Text></View>):<View style={s.card}><Text style={s.title}>Data contoh GIS</Text><Text style={s.text}>RW 02 · RT 04 dan RT 05 akan tampil setelah seed master GIS aktif.</Text></View>}
 <Text style={s.caption}>Mode darurat memakai persetujuan eksplisit; bukan pelacakan permanen.</Text></View>
}
function News({data,open}:any){return <View><Text style={s.eyebrow}>KABAR DESA</Text><Text style={s.pageTitle}>Yang sedang terjadi.</Text>{data.map((x:any)=><Pressable key={x.id} style={s.news} onPress={()=>open(x)}><Image source={{uri:x.image_url}} style={s.newsImage}/><View style={s.newsBody}><Text style={s.meta}>{x.category}</Text><Text style={s.title}>{x.title}</Text><Text style={s.text}>{x.summary}</Text><Text style={s.link}>Baca selengkapnya →</Text></View></Pressable>)}</View>}
function Agenda({data,open}:any){return <View><Text style={s.eyebrow}>AGENDA</Text><Text style={s.pageTitle}>Agenda wilayah.</Text>{data.map((x:any)=><Pressable key={x.id} style={s.agenda} onPress={()=>open(x)}><View style={s.date}><Text style={s.day}>{x.date?.split(" ")[0]}</Text><Text style={s.month}>{x.date?.split(" ").slice(1).join(" ")}</Text></View><View style={{flex:1}}><Text style={s.meta}>{x.type}</Text><Text style={s.title}>{x.title}</Text><Text style={s.text}>{x.time} · {x.location}</Text></View><Text style={s.arrow}>→</Text></Pressable>)}</View>}
function RoleRoom({role,profile,emergency}:any){
 const isRt=role==="KETUA_RT"||role==="PENGURUS_RT";const isRw=role==="KETUA_RW"||role==="PENGURUS_RW";
 const action=(label:string)=>Alert.alert(label,"Modul ini sudah terhubung ke ruang kerja. Data contoh akan tampil setelah master demo dimuat.");
 return <View><Text style={s.eyebrow}>RUANG {role}</Text><Text style={s.pageTitle}>{isRt?"Operasional RT.":isRw?"Koordinasi RW.":"Layanan warga."}</Text>
 <View style={s.card}><Text style={s.title}>{profile?.full_name||"Akun terhubung"}</Text><Text style={s.text}>Scope wilayah: RT {profile?.rt_number||"—"} · RW {profile?.rw_number||"—"}</Text><Text style={s.text}>Privilege berasal dari role assignment terverifikasi, bukan pilihan saat daftar.</Text></View>
 {isRt||isRw?<><View style={s.grid}><Quick title="Verifikasi warga" icon="✓" go={()=>action("Verifikasi warga")}/><Quick title="Laporan wilayah" icon="▤" go={()=>action("Laporan wilayah")}/><Quick title="Emergency center" icon="!" go={emergency}/><Quick title="Peta wilayah" icon="⌖" go={()=>action("Peta wilayah")}/></View><View style={s.card}><Text style={s.title}>Master komunitas</Text><Text style={s.text}>Warga · usaha · organisasi · kegiatan · bantuan/CSR · aset · lingkungan dan infrastruktur siap ditampilkan sesuai scope.</Text></View></>:<View style={s.card}><Text style={s.title}>Layanan pribadi</Text><Text style={s.text}>Surat, pengaduan, agenda, informasi publik dan bantuan darurat tersedia dari ruang warga.</Text></View>}</View>}
function Nav({tab,setTab}:any){return <View style={s.nav}>{[["home","Beranda","⌂"],["map","Peta","⌖"],["news","Kabar","◉"],["agenda","Agenda","◷"],["room","Ruang","◎"]].map(([k,l,i])=><Pressable key={k} style={s.navItem} onPress={()=>setTab(k as Tab)}><View style={[s.navIcon,k===tab&&s.navIconActive]}><Text style={[s.navIconText,k===tab&&s.active]}>{i}</Text></View><Text style={[s.navLabel,k===tab&&s.active]}>{l}</Text></Pressable>)}</View>}

function AuthModal({visible,mode,setMode,selectedPlan="TRIAL",close,onNotice}:any){
  const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [name,setName]=useState("");const [phone,setPhone]=useState("");const [selected,setSelected]=useState<Role>("WARGA");const [village,setVillage]=useState("Desa Pilot");const [rt,setRt]=useState("");const [rw,setRw]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  async function submit(){
    setBusy(true);setError("");
    if(mode==="signin"){const r=await sb.auth.signInWithPassword({email:email.trim(),password});if(r.error)setError(r.error.message);else{close();onNotice("Login berhasil.");}}
    else{
      if(!name.trim()||!email.trim()||password.length<6){setError("Nama, email dan password minimal 6 karakter wajib diisi.");setBusy(false);return;}
      if(selected!=="WARGA"&&(!rt.trim()||!rw.trim())){setError("Nomor RT dan RW diperlukan untuk pendaftaran pengurus.");setBusy(false);return;}
      const r=await sb.auth.signUp({email:email.trim(),password,options:{data:{full_name:name.trim(),phone:phone.trim(),requested_role:selected,village_label:village.trim(),rt_number:rt.trim(),rw_number:rw.trim(),requested_plan:selectedPlan}}});
      if(r.error)setError(r.error.message);else{close();onNotice(selected==="WARGA"?"Akun Warga aktif.":"Permintaan peran "+selected+" masuk antrean verifikasi.");}
    }
    setBusy(false);
  }
  return <Modal visible={visible} animationType="slide" onRequestClose={close}><SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.authScroll}><View style={s.auth}><Pressable onPress={close}><Text style={s.link}>Tutup ×</Text></Pressable><View style={s.mark}><Text style={s.markText}>SV</Text></View><Text style={s.eyebrow}>{mode==="signup"?"DAFTAR AKUN":"MASUK"}</Text><Text style={s.heroTitle}>{mode==="signup"?"Pilih peran Anda.":"Selamat datang kembali."}</Text><Text style={s.intro}>{mode==="signup"?"Pilihan peran menentukan alur verifikasi, bukan kewenangan otomatis.":"Akses diberikan sesuai role assignment dan wilayah."}</Text>{mode==="signup"?<View style={s.card}><Text style={s.meta}>PAKET DIPILIH</Text><Text style={s.planTitle}>{selectedPlan}</Text><Text style={s.text}>{selectedPlan==="COMMUNITY"?"Dukungan/donasi RT/RW.":selectedPlan==="PRO"?"Langganan Pro.":selectedPlan==="ENTERPRISE"?"Kontrak Enterprise.":"Trial 7 hari."}</Text></View>:null}{mode==="signup"?<><TextInput style={s.input} placeholder="Nama lengkap" value={name} onChangeText={setName}/><TextInput style={s.input} placeholder="No. HP" value={phone} onChangeText={setPhone}/><Text style={s.formLabel}>PERAN</Text>{ROLES.map(r=><Pressable key={r.code} style={[s.roleChoice,selected===r.code&&s.roleChoiceActive]} onPress={()=>setSelected(r.code)}><Text style={s.roleChoiceText}>{r.title}</Text><Text style={s.roleChoiceNote}>{r.note}</Text></Pressable>)}<TextInput style={s.input} placeholder="Desa/Kelurahan" value={village} onChangeText={setVillage}/>{selected!=="WARGA"?<View style={s.row}><TextInput style={[s.input,s.half]} placeholder="RT" value={rt} onChangeText={setRt}/><TextInput style={[s.input,s.half]} placeholder="RW" value={rw} onChangeText={setRw}/></View>:null}</>:null}<TextInput style={s.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail}/><TextInput style={s.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword}/>{error?<Text style={s.error}>{error}</Text>:null}<Pressable style={s.primaryButton} onPress={submit} disabled={busy}>{busy?<ActivityIndicator color="#fff"/>:<Text style={s.primaryButtonText}>{mode==="signup"?"Buat akun":"Masuk"}</Text>}</Pressable><Pressable style={s.modeSwitch} onPress={()=>{setMode(mode==="signup"?"signin":"signup");setError("")}}><Text style={s.link}>{mode==="signup"?"Sudah punya akun? Masuk":"Belum punya akun? Daftar"}</Text></Pressable></View></ScrollView></SafeAreaView></Modal>
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:"#F6F4EE"},app:{flex:1,backgroundColor:"#F6F4EE"},header:{padding:18,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},brandRow:{flexDirection:"row",alignItems:"center"},mark:{width:40,height:40,borderRadius:13,backgroundColor:"#16352C",alignItems:"center",justifyContent:"center",marginRight:10},markText:{color:"#fff",fontWeight:"900",fontSize:11},brand:{color:"#16352C",fontSize:14,fontWeight:"900",letterSpacing:1},sub:{color:"#718079",fontSize:8,letterSpacing:1},login:{backgroundColor:"#fff",borderWidth:1,borderColor:"#CBD6D0",paddingHorizontal:14,paddingVertical:9,borderRadius:18},loginText:{color:"#16352C",fontWeight:"900"},content:{paddingHorizontal:18,paddingBottom:110},notice:{marginHorizontal:18,backgroundColor:"#16352C",padding:12,borderRadius:14},noticeText:{color:"#fff",fontWeight:"800",fontSize:12},eyebrow:{color:"#4D7467",fontSize:10,fontWeight:"900",letterSpacing:1.6,marginBottom:7},pageTitle:{color:"#16352C",fontSize:30,lineHeight:35,fontWeight:"900"},intro:{color:"#687770",fontSize:13,lineHeight:20,marginVertical:10},greeting:{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-end",marginBottom:18},rolePill:{backgroundColor:"#E5EEE9",borderRadius:18,padding:8},roleText:{color:"#356557",fontSize:9,fontWeight:"900"},hero:{backgroundColor:"#16352C",borderRadius:24,padding:20,marginBottom:22},heroEyebrow:{color:"#AFC7BD",fontSize:9,fontWeight:"900",letterSpacing:1.4},heroText:{color:"#fff",fontSize:22,fontWeight:"900",marginTop:5},heroSub:{color:"#C7D5CF",fontSize:13,lineHeight:19,marginTop:8},heroButton:{alignSelf:"flex-start",backgroundColor:"#E6F0EB",borderRadius:13,padding:11,marginTop:15},heroButtonText:{color:"#16352C",fontWeight:"900"},section:{color:"#16352C",fontSize:20,fontWeight:"900",marginBottom:12},grid:{flexDirection:"row",flexWrap:"wrap",justifyContent:"space-between",marginBottom:14},quick:{width:"48.5%",backgroundColor:"#fff",borderWidth:1,borderColor:"#E0E6E2",borderRadius:18,padding:16,marginBottom:10,minHeight:100},quickIcon:{color:"#356557",fontSize:22,fontWeight:"900",marginBottom:15},quickTitle:{color:"#16352C",fontSize:14,fontWeight:"900"},pending:{backgroundColor:"#FFF2D8",borderRadius:18,padding:16,marginBottom:12},emergency:{backgroundColor:"#FFF0EA",borderWidth:1,borderColor:"#F1C9BC",borderRadius:20,padding:18,marginTop:10,marginBottom:18},emergencyTitle:{color:"#8A3F2D",fontSize:10,fontWeight:"900",letterSpacing:1.3},emergencyText:{color:"#75483D",fontSize:12,lineHeight:18,marginTop:7},emergencyButton:{backgroundColor:"#9B4530",borderRadius:13,padding:12,marginTop:13,alignItems:"center"},emergencyButtonText:{color:"#fff",fontWeight:"900"},map:{height:430,borderRadius:22,overflow:"hidden",marginVertical:12},mapNotice:{backgroundColor:"#FFF2D8",borderRadius:16,padding:14},mapActions:{flexDirection:"row",gap:10},primaryButton:{backgroundColor:"#356557",minHeight:46,borderRadius:14,alignItems:"center",justifyContent:"center",paddingHorizontal:18,marginTop:12},primaryButtonText:{color:"#fff",fontWeight:"900"},secondaryButton:{backgroundColor:"#E7EFEA",minHeight:46,borderRadius:14,alignItems:"center",justifyContent:"center",paddingHorizontal:18,marginTop:12},secondaryButtonText:{color:"#16352C",fontWeight:"900"},caption:{color:"#718079",fontSize:10,lineHeight:15,marginTop:10},news:{backgroundColor:"#fff",borderRadius:20,overflow:"hidden",marginBottom:12,borderWidth:1,borderColor:"#E0E6E2"},newsImage:{width:"100%",height:165},newsBody:{padding:17},meta:{color:"#718079",fontSize:9,fontWeight:"900",letterSpacing:1,marginBottom:7},title:{color:"#16352C",fontSize:17,fontWeight:"900",lineHeight:23,marginBottom:6},text:{color:"#687770",fontSize:13,lineHeight:20},link:{color:"#356557",fontWeight:"900",fontSize:12,marginTop:9},agenda:{backgroundColor:"#fff",borderRadius:18,padding:13,marginBottom:10,flexDirection:"row",alignItems:"center",borderWidth:1,borderColor:"#E0E6E2"},date:{width:58,height:62,borderRadius:15,backgroundColor:"#E7EFEA",alignItems:"center",justifyContent:"center",marginRight:12},day:{color:"#16352C",fontSize:22,fontWeight:"900"},month:{color:"#4D7467",fontSize:9,fontWeight:"900"},arrow:{color:"#4D7467",fontSize:20},card:{backgroundColor:"#fff",borderRadius:18,padding:17,borderWidth:1,borderColor:"#E0E6E2",marginBottom:12},headerActions:{flexDirection:"row",alignItems:"center",gap:7},headerAvatar:{width:42,height:42,borderRadius:21,backgroundColor:"#E7EFEA",alignItems:"center",justifyContent:"center",marginRight:9,overflow:"hidden"},headerAvatarImage:{width:42,height:42},headerAvatarText:{color:"#356557",fontWeight:"900",fontSize:16},chatMini:{width:38,height:38,borderRadius:19,backgroundColor:"#E7EFEA",alignItems:"center",justifyContent:"center"},chatMiniText:{fontSize:18},profileCard:{backgroundColor:"#fff",borderRadius:22,padding:14,flexDirection:"row",alignItems:"center",gap:12,borderWidth:1,borderColor:"#E0E6E2",marginBottom:12},profileAvatar:{width:64,height:64,borderRadius:32,backgroundColor:"#E7EFEA",alignItems:"center",justifyContent:"center",overflow:"hidden"},profileAvatarImage:{width:64,height:64},profileAvatarText:{color:"#356557",fontSize:24,fontWeight:"900"},profileName:{color:"#16352C",fontSize:16,fontWeight:"900",marginVertical:2},chatHero:{backgroundColor:"#16352C",borderRadius:22,padding:15,flexDirection:"row",alignItems:"center",gap:11,marginBottom:18},chatHeroIcon:{width:44,height:44,borderRadius:22,backgroundColor:"#E7EFEA",alignItems:"center",justifyContent:"center"},chatHeroTitle:{color:"#fff",fontWeight:"900",fontSize:13,letterSpacing:1},chatArrow:{color:"#fff",fontSize:22},nav:{position:"absolute",bottom:0,left:0,right:0,height:82,backgroundColor:"#fff",borderTopWidth:1,borderTopColor:"#E0E6E2",flexDirection:"row",justifyContent:"space-around",paddingTop:6},navItem:{alignItems:"center",width:"20%"},navIcon:{width:38,height:30,borderRadius:11,alignItems:"center",justifyContent:"center"},navIconActive:{backgroundColor:"#E7EFEA"},navIconText:{fontSize:18,color:"#92A09A"},navLabel:{fontSize:9,color:"#7B8882",fontWeight:"800"},active:{color:"#16352C"},backdrop:{flex:1,backgroundColor:"rgba(22,53,44,.45)",justifyContent:"flex-end"},sheet:{backgroundColor:"#F6F4EE",maxHeight:"90%",borderTopLeftRadius:28,borderTopRightRadius:28},sheetContent:{padding:22,paddingBottom:45},detailImage:{width:"100%",height:190,borderRadius:18,marginBottom:12},close:{alignSelf:"flex-end"},heroTitle:{color:"#16352C",fontSize:29,lineHeight:35,fontWeight:"900",marginBottom:10},authScroll:{flexGrow:1},auth:{padding:22,paddingBottom:40},input:{backgroundColor:"#fff",borderWidth:1,borderColor:"#DCE4DF",borderRadius:14,paddingHorizontal:14,paddingVertical:13,marginTop:9,color:"#16352C"},formLabel:{color:"#52625B",fontSize:10,fontWeight:"900",letterSpacing:1.2,marginTop:14,marginBottom:7},roleChoice:{backgroundColor:"#fff",borderWidth:1,borderColor:"#DCE4DF",borderRadius:14,padding:12,marginBottom:7},roleChoiceActive:{backgroundColor:"#E7EFEA",borderColor:"#7EA897"},roleChoiceText:{color:"#16352C",fontWeight:"900"},roleChoiceNote:{color:"#74817B",fontSize:10,marginTop:3},row:{flexDirection:"row",gap:8},half:{flex:1},error:{color:"#A63D3D",fontSize:12,lineHeight:18,marginTop:9},modeSwitch:{alignItems:"center",padding:12,marginTop:8},landing:{flexGrow:1,backgroundColor:"#16352C",padding:25,justifyContent:"center"},landingBadge:{alignSelf:"flex-start",color:"#BFD7CD",borderWidth:1,borderColor:"#527467",paddingHorizontal:10,paddingVertical:7,borderRadius:15,fontSize:10,fontWeight:"900",letterSpacing:1.5},landingTitle:{color:"#fff",fontSize:38,lineHeight:43,fontWeight:"900",marginTop:18},landingText:{color:"#C7D5CF",fontSize:15,lineHeight:22,marginTop:12},aiCard:{backgroundColor:"#E7EFEA",borderRadius:20,padding:16,marginBottom:18,flexDirection:"row",alignItems:"center",gap:10},aiOrb:{width:44,height:44,borderRadius:22,backgroundColor:"#16352C",alignItems:"center",justifyContent:"center"},aiOrbText:{color:"#fff",fontWeight:"900"},aiTitle:{color:"#16352C",fontWeight:"900",marginBottom:3},aiButton:{backgroundColor:"#fff",borderRadius:12,paddingHorizontal:10,paddingVertical:9},aiButtonText:{color:"#16352C",fontWeight:"900",fontSize:11},aiSheet:{backgroundColor:"#F6F4EE",borderTopLeftRadius:28,borderTopRightRadius:28,padding:22,paddingBottom:35},aiReply:{color:"#16352C",fontSize:18,lineHeight:26,fontWeight:"700",marginVertical:10},helpCard:{backgroundColor:"#fff",borderRadius:20,padding:17,borderWidth:1,borderColor:"#E0E6E2",marginTop:4,marginBottom:14},contactRow:{flexDirection:"row",alignItems:"center",paddingVertical:10,borderTopWidth:1,borderTopColor:"#EDF1EE"},callButton:{width:40,height:40,borderRadius:20,backgroundColor:"#E7EFEA",alignItems:"center",justifyContent:"center"},callText:{color:"#16352C",fontSize:20},sensorToggle:{marginTop:10,alignItems:"center",padding:8},sensorToggleText:{color:"#8A3F2D",fontWeight:"900",fontSize:11},landingMap:{backgroundColor:"#21483D",borderRadius:22,padding:20,marginVertical:28},mapGlyph:{color:"#9FD0BB",fontSize:38},mapTitle:{color:"#fff",fontSize:18,fontWeight:"900",marginTop:8},mapText:{color:"#BFD7CD",fontSize:12,lineHeight:18,marginTop:5},landingPrimary:{backgroundColor:"#E6F0EB",borderRadius:15,padding:15,alignItems:"center",marginBottom:10},landingPrimaryText:{color:"#16352C",fontWeight:"900"},landingSecondary:{borderWidth:1,borderColor:"#6A8B7F",borderRadius:15,padding:15,alignItems:"center"},landingSecondaryText:{color:"#fff",fontWeight:"900"},landingFoot:{color:"#94AEA4",fontSize:10,lineHeight:16,textAlign:"center",marginTop:18},planCard:{backgroundColor:"#fff",borderRadius:18,padding:16,borderWidth:1,borderColor:"#DCE4DF",marginBottom:18},planTitle:{color:"#16352C",fontSize:22,fontWeight:"900",marginVertical:4},landingPlanTitle:{color:"#fff",fontSize:22,fontWeight:"900",marginTop:4},landingPlanHint:{color:"#BFD7CD",fontSize:11,lineHeight:17,marginTop:5,marginBottom:10},landingPlan:{backgroundColor:"#21483D",borderWidth:1,borderColor:"#527467",borderRadius:17,padding:14,marginBottom:8,flexDirection:"row",alignItems:"center"},landingPlanActive:{borderColor:"#E6F0EB",backgroundColor:"#2A5449"},landingPlanName:{color:"#fff",fontSize:15,fontWeight:"900"},landingPlanPrice:{color:"#D1E2DA",fontSize:10,fontWeight:"800",marginTop:3},landingPlanNote:{color:"#AFC7BD",fontSize:10,lineHeight:15,marginTop:3},landingPlanArrow:{color:"#fff",fontSize:28},gisCanvas:{height:430,borderRadius:22,overflow:"hidden",backgroundColor:"#DDE8E2",marginVertical:12,position:"relative"},gisGrid:{...StyleSheet.absoluteFillObject,flexDirection:"row",flexWrap:"wrap"},gisGridCell:{width:"20%",height:"20%",borderWidth:0.5,borderColor:"#C6D6CE"},gisRoadOne:{position:"absolute",left:-30,top:205,width:520,height:18,backgroundColor:"#F4F0E5",transform:[{rotate:"-8deg"}]},gisRoadTwo:{position:"absolute",left:110,top:-30,width:14,height:520,backgroundColor:"#F4F0E5",transform:[{rotate:"22deg"}]},gisZoneOne:{position:"absolute",left:35,top:75,width:135,height:150,borderRadius:24,backgroundColor:"rgba(77,138,118,.38)",borderWidth:2,borderColor:"#4D8A76",padding:12},gisZoneTwo:{position:"absolute",right:30,top:170,width:145,height:145,borderRadius:24,backgroundColor:"rgba(22,53,44,.25)",borderWidth:2,borderColor:"#16352C",padding:12},gisZoneText:{color:"#16352C",fontWeight:"900"},gisPin:{position:"absolute",left:"48%",top:"46%",width:42,height:42,borderRadius:21,backgroundColor:"#fff",alignItems:"center",justifyContent:"center",elevation:4},gisPinText:{color:"#356557",fontSize:22},territoryCard:{backgroundColor:"#fff",borderRadius:16,padding:13,borderWidth:1,borderColor:"#E0E6E2",marginBottom:8},demoStrip:{flexDirection:"row",justifyContent:"space-between",marginBottom:12},demoStat:{backgroundColor:"#E7EFEA",borderRadius:14,padding:10,width:"23%"},demoNumber:{color:"#16352C",fontSize:20,fontWeight:"900"},demoLabel:{color:"#52625B",fontSize:8,lineHeight:12,marginTop:3}
});
