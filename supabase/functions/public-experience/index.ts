import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"};
const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const PUBLIC_DEMO_TERRITORY_ID="f06b8420-54f5-4ee4-b487-bacc7b374dd2";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});

const eventDescription=(type:string,name:string,notes:string|null)=>{
  const t=String(type||"").toUpperCase();
  const defaults:Record<string,string>={
    RAPAT_RT:"Pertemuan warga untuk membahas pelayanan, lingkungan, keamanan, dan kebutuhan bersama di tingkat RT.",
    OLAHRAGA:"Kegiatan olahraga bersama warga untuk menjaga kebugaran sekaligus mempererat hubungan komunitas.",
    GOTONG_ROYONG:"Kegiatan gotong royong warga untuk menjaga kebersihan, lingkungan, dan fasilitas bersama."
  };
  return defaults[t]||"Kegiatan warga yang telah disetujui untuk publikasi.";
};

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 if(req.method!=="GET"&&req.method!=="POST") return json({ok:false,error:"METHOD_NOT_ALLOWED"},405);
 try{
  const body=req.method==="POST"?await req.json().catch(()=>null):{};
  if(!body||typeof body!=="object"||Array.isArray(body)) return json({ok:false,error:"INVALID_REQUEST"},400);
  if("territory_id" in body && body.territory_id!==PUBLIC_DEMO_TERRITORY_ID) return json({ok:false,error:"TERRITORY_NOT_ALLOWED"},403);
  const action=body.action||"agenda_list"; const territoryId=PUBLIC_DEMO_TERRITORY_ID;
  const t=await admin.from("territories").select("id,territory_type,active").eq("id",territoryId).eq("territory_type","VILLAGE").eq("active",true).maybeSingle();
  if(t.error||!t.data) throw new Error("Wilayah tidak valid atau tidak aktif");

  if(action==="agenda_list"||action==="community_list"){
    const {data,error}=await admin.from("community_events")
      .select("id,territory_id,organization_id,organizer_person_id,event_type,name,event_date,start_at,location,status,notes,public_visible")
      .eq("territory_id",territoryId).eq("public_visible",true).neq("status","CANCELLED")
      .order("event_date").order("start_at").limit(50);
    if(error)throw error;
    const records=(data||[]).filter(x=>!/synthetic/i.test(String(x.notes||"")) || /DEMO_3YEAR/i.test(String(x.notes||""))).map(x=>({
      id:x.id, agenda_id:x.id, territory_id:x.territory_id,
      title:x.name, name:x.name,
      description:eventDescription(x.event_type,x.name,x.notes),
      event_type:x.event_type, status:x.status, event_date:x.event_date,
      start_at:x.start_at, location:x.location,
      organizer:x.organization_id?"Organisasi Desa":"Tata Kelola Desa Demo",
      territory:"Desa Demo · PILOT-DESA",
      source_data:"SIM RT/RW · Community Events · Public Experience",
      public_visible:Boolean(x.public_visible),
      public_visible_label:Boolean(x.public_visible)?"TRUE":"FALSE",

    }));
    return json({ok:true,records});
  }

  if(action==="agenda_detail"){
    const agendaId=String(body.agenda_id||body.id||"").trim();
    if(!agendaId) throw new Error("ID agenda tidak ditemukan");
    const {data,error}=await admin.from("community_events")
      .select("id,territory_id,organization_id,organizer_person_id,event_type,name,event_date,start_at,location,status,notes,public_visible")
      .eq("id",agendaId).eq("territory_id",territoryId).eq("public_visible",true).neq("status","CANCELLED").maybeSingle();
    if(error) throw error;
    if(!data) throw new Error("Agenda tidak ditemukan atau belum dipublikasikan");
    const x=data;
    const record={
      id:x.id, agenda_id:x.id, territory_id:x.territory_id,
      title:x.name, name:x.name,
      description:eventDescription(x.event_type,x.name,x.notes),
      event_type:x.event_type, status:x.status, event_date:x.event_date,
      start_at:x.start_at, location:x.location,
      organizer:x.organization_id?"Organisasi Desa":"Tata Kelola Desa Demo",
      territory:"Desa Demo · PILOT-DESA",
      source_data:"SIM RT/RW · Community Events · Public Experience",
      public_visible:Boolean(x.public_visible),
      public_visible_label:Boolean(x.public_visible)?"TRUE":"FALSE",

    };
    return json({ok:true,record});
  }

  if(action==="announcement_list"||action==="news_list"){ const {data,error}=await admin.from("public_announcements").select("id,title,summary,category,published_at,image_url").eq("territory_id",territoryId).eq("status","PUBLISHED").order("published_at",{ascending:false}).limit(50); if(error)throw error; return json({ok:true,records:data||[]}); }

  if(action==="economy_list"){
    const {data,error}=await admin.from("rt_business_profiles").select("id,business_name,business_type,sector,products_services,scale,worker_count,sales_channels,licensing_status,verification_status").eq("territory_id",territoryId).eq("public_visible",true).not("source","eq","DEMO_SEED").order("business_name").limit(100);
    if(error)throw error;
    const rows=data||[], products=new Set(), sectors=new Set(); rows.forEach(x=>{String(x.products_services||"").split(/[,;\n]+/).map(v=>v.trim()).filter(Boolean).forEach(v=>products.add(v));if(x.sector)sectors.add(x.sector)});
    return json({ok:true,stats:{businesses:rows.length,products:products.size,sectors:sectors.size},records:rows.map(x=>({id:x.id,business_name:x.business_name,business_type:x.business_type,sector:x.sector,products_services:x.products_services,scale:x.scale,worker_count:x.worker_count,sales_channels:x.sales_channels,verification_status:x.verification_status}))});
  }
  throw new Error("Unsupported action");
 }catch(_e){return json({ok:false,error:"REQUEST_FAILED"},500);}
});