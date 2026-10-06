import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const INTENT_GUIDE="Identifikasi maksud pengguna sebelum menjawab. Pertahankan konteks percakapan: pertanyaan lanjutan seperti berapa, bagaimana, atau lalu merujuk pada topik terakhir. Bedakan pertanyaan informasi, prosedur, analisis, rekomendasi, pembuatan dokumen, keluhan, dan keadaan darurat. Jangan mengarang data. Jika konteks kurang, tanyakan hanya satu hal yang paling penting.";\nconst fallback={
  WARGA:"Saya di sini untuk membantu Anda aktif di lingkungan. Coba ceritakan satu hal yang menurut Anda bisa diperbaiki di RT Anda minggu ini. Kita bisa ubah ide itu menjadi langkah kecil yang realistis.",
  KETUA_RT:"Mari mulai dari prioritas RT: pelayanan warga, pengaduan, keamanan, kebersihan, agenda, atau emergency. Sebutkan isu yang paling mendesak dan saya bantu menyusun langkahnya.",
  PENGURUS_RT:"Saya dapat membantu membuat checklist operasional RT, menyusun agenda, merapikan laporan, dan menyiapkan komunikasi warga sesuai kewenangan Anda.",
  KETUA_RW:"Saya dapat membantu membaca pola masalah lintas RT dalam bentuk agregat, menyusun agenda koordinasi, dan merumuskan opsi tindak lanjut tanpa membuka data pribadi warga.",
  PENGURUS_RW:"Saya dapat membantu pekerjaan operasional RW, koordinasi agenda, dan penyusunan ringkasan kegiatan sesuai scope wilayah Anda."
};

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 try{
  const auth=req.headers.get("Authorization"); if(!auth) throw new Error("Unauthorized");
  const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_PUBLISHABLE_KEY")??Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});
  const {data:{user}}=await supabase.auth.getUser(); if(!user) throw new Error("Unauthorized");
  const body=await req.json(); const role=String(body.role||"WARGA"); const message=String(body.message||"").trim();
  if(!message) throw new Error("Message is required");
  const allowed=["WARGA","KETUA_RT","PENGURUS_RT","KETUA_RW","PENGURUS_RW"]; if(!allowed.includes(role)) throw new Error("Invalid role");
  const {data:profile}=await supabase.from("sv_ai_companion_profiles").select("mode,context_level,voice_enabled,system_hint").eq("role_code",role).maybeSingle();
  let reply=fallback[role as keyof typeof fallback];
  const apiKey=Deno.env.get("OPENAI_API_KEY");
  if(apiKey){
    const model=Deno.env.get("OPENAI_MODEL")||"gpt-6-luna";
    const instructions=[
      "Anda adalah AI Companion Smart Village RT/RW-SID CONNECT.",
      "Gunakan Bahasa Indonesia yang hangat, singkat, konkret, dan mendorong partisipasi.",
      "Jangan mengaku sebagai petugas resmi. Jangan memberi diagnosis medis. Untuk keadaan darurat arahkan ke fitur emergency dan kontak resmi.",
      "Jangan meminta, menebak, atau mengungkap NIK, data keluarga, lokasi orang lain, atau data sensitif yang tidak diperlukan.",
      "Kewenangan harus dibatasi pada role dan scope pengguna. Role assignment, bukan pilihan registrasi, adalah sumber otorisasi.",
      `Role pengguna: ${role}. Mode: ${profile?.mode||"COMPANION"}. Context level: ${profile?.context_level||1}.`,
      profile?.system_hint||"",
      "Jawaban harus langsung menjawab pertanyaan terlebih dahulu, lalu beri langkah atau pertanyaan lanjutan bila relevan. Jangan mengulang salam atau template fallback bila pertanyaan sudah jelas."
    ].join("\n");
    const history=Array.isArray(body.history)?body.history.slice(-8).map((x:any)=>({role:String(x.role||"user"),content:String(x.content||"")})).filter((x:any)=>x.content):[];\n    const context=String(body.context||"").slice(0,6000);\n    const rr=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${apiKey}`},body:JSON.stringify({model,instructions,input:INTENT_GUIDE+"\nKonteks aplikasi: "+(context||"RT/RW-SID CONNECT")+"\nRiwayat percakapan:\n"+history.map((x:any)=>x.role+": "+x.content).join("\n")+"\nPertanyaan terbaru: "+message,max_output_tokens:600})});
    if(rr.ok){const j=await rr.json();reply=j.output_text||j.output?.flatMap((x:any)=>x.content||[]).find((x:any)=>x.type==="output_text")?.text||reply;}
  }
  await supabase.from("sv_ai_companion_messages").insert([{user_id:user.id,role_code:role,direction:"USER",message},{user_id:user.id,role_code:role,direction:"COMPANION",message:reply}]);
  return new Response(JSON.stringify({reply,voice:profile?.voice_enabled!==false}),{headers:{...cors,"Content-Type":"application/json"}});
 }catch(e){return new Response(JSON.stringify({error:String(e?.message||e)}),{status:400,headers:{...cors,"Content-Type":"application/json"}})}
});