import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Content-Type":"application/json"};
const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const eventDescription=(type:string,name:string,notes:string|null)=>{
  const t=String(type||"").toUpperCase();
  const defaults:Record<string,string>={
    RAPAT_RT:"Pertemuan warga untuk membahas pelayanan, lingkungan, keamanan, dan kebutuhan bersama di tingkat RT.",
    OLAHRAGA:"Kegiatan olahraga bersama warga untuk menjaga kebugaran sekaligus mempererat hubungan komunitas.",
    GOTONG_ROYONG:"Kegiatan gotong royong warga untuk menjaga kebersihan, lingkungan, dan fasilitas bersama."
  };
  return notes && !/DEMO_3YEAR|synthetic/i.test(notes) ? notes : (defaults[t]||`Kegiatan warga ${name} yang telah ditandai dapat dipublikasikan oleh tata kelola desa.`);
};

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 try{
  const body=await req.json().catch(()=>({})); const action=body.action||"agenda_list"; const territoryId=body.territory_id||"f06b8420-54f5-4ee4-b487-bacc7b374dd2";
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
      notes:x.notes
    }));
    return new Response(JSON.stringify({ok:true,records}),{headers:cors});
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
      notes:x.notes
    };
    return new Response(JSON.stringify({ok:true,record}),{headers:cors});
  }

  if(action==="announcement_list"||action==="news_list"){ const {data,error}=await admin.from("public_announcements").select("id,title,summary,content,category,published_at,image_url").eq("territory_id",territoryId).eq("status","PUBLISHED").order("published_at",{ascending:false}).limit(50); if(error)throw error; return new Response(JSON.stringify({ok:true,records:data||[]}),{headers:cors}); }

  if(action==="economy_list"){
    const {data,error}=await admin.from("rt_business_profiles").select("id,business_name,business_type,sector,products_services,scale,worker_count,sales_channels,licensing_status,verification_status").eq("territory_id",territoryId).eq("public_visible",true).not("source","eq","DEMO_SEED").order("business_name").limit(100);
    if(error)throw error;
    const rows=data||[], products=new Set(), sectors=new Set(); rows.forEach(x=>{String(x.products_services||"").split(/[,;\n]+/).map(v=>v.trim()).filter(Boolean).forEach(v=>products.add(v));if(x.sector)sectors.add(x.sector)});
    return new Response(JSON.stringify({ok:true,stats:{businesses:rows.length,products:products.size,sectors:sectors.size},records:rows}),{headers:cors});
  }
  throw new Error("Unsupported action");
 }catch(e){return new Response(JSON.stringify({ok:false,error:e?.message||"Unexpected error"}),{status:400,headers:cors});}
});