import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};

const ALLOWED=new Set([
  "HOUSEHOLD","KTP_EL","KIA","DATA_CHANGE","BIRTH","DEATH","MOVE",
  "COMPLAINT","LETTER_DOMICILE","LETTER_BUSINESS","LETTER_INTRO","LETTER_OTHER",
  "ACTIVITY_RT","ACTIVITY_RW","ACTIVITY_VILLAGE","ACTIVITY_COMMUNITY"
]);

const text=(v)=>v==null||v===""?null:String(v).trim()||null;

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  try{
    const auth=req.headers.get("Authorization");
    if(!auth) throw new Error("Authorization required");

    const anon=createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {global:{headers:{Authorization:auth}}}
    );
    const {data:{user},error:ue}=await anon.auth.getUser();
    if(ue||!user) throw new Error("Authenticated user required");

    const admin=createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body=await req.json();
    const action=String(body.action||"submit").toLowerCase();

    if(action==="list"){
      const {data,error}=await admin.from("rt_service_requests")
        .select("id,request_number,service_type,status,payload,created_at,updated_at,territory_id")
        .eq("created_by",user.id)
        .order("created_at",{ascending:false})
        .limit(50);
      if(error) throw error;
      return new Response(JSON.stringify({ok:true,records:data||[]}),{headers:{...cors,"Content-Type":"application/json"}});
    }

    if(action==="business_register"){
      const territory_id=text(body.territory_id);
      const p=body.payload&&typeof body.payload==="object"?body.payload:{};
      if(!territory_id) throw new Error("Wilayah usaha wajib dipilih");

      const {data:territory,error:te}=await admin.from("territories")
        .select("id,name,territory_type,active")
        .eq("id",territory_id).eq("active",true).maybeSingle();
      if(te) throw te;
      if(!territory||territory.territory_type!=="VILLAGE") throw new Error("Wilayah usaha tidak valid");

      const business_name=text(p.business_name);
      const business_type=text(p.business_type);
      if(!business_name||!business_type) throw new Error("Nama usaha dan jenis usaha wajib diisi");

      const workerCount=p.worker_count==null||p.worker_count===""?0:Number(p.worker_count);
      if(!Number.isInteger(workerCount)||workerCount<0) throw new Error("Jumlah pekerja tidak valid");

      const {data:record,error:re}=await admin.from("rt_business_profiles").insert({
        territory_id,
        owner_person_id:null,
        business_name,
        business_type,
        sector:text(p.sector),
        products_services:text(p.products_services),
        scale:text(p.scale),
        worker_count:workerCount,
        sales_channels:text(p.sales_channels),
        licensing_status:text(p.licensing_status),
        needs:text(p.needs),
        constraints:text(p.constraints),
        potential:text(p.potential),
        verification_status:"DRAFT",
        classification:"INTERNAL",
        source:"PUBLIC_PORTAL",
        created_by:user.id,
        public_visible:false
      }).select().single();
      if(re) throw re;

      await admin.from("audit_logs").insert({
        actor_user_id:user.id,
        action:"PUBLIC_BUSINESS_REGISTERED",
        entity_type:"rt_business_profiles",
        entity_id:record.id,
        scope_territory_id:territory_id,
        after_data:record,
        source:"SMART_VILLAGE_PUBLIC_PORTAL",
        authority:"PUBLIC_PORTAL"
      });

      return new Response(JSON.stringify({ok:true,record,message:"Profil usaha tersimpan dan menunggu verifikasi desa."}),{headers:{...cors,"Content-Type":"application/json"}});
    }

    const service_type=String(body.service_type||"").trim().toUpperCase();
    const territory_id=text(body.territory_id);
    const p=body.payload&&typeof body.payload==="object"?body.payload:{};

    if(!ALLOWED.has(service_type)) throw new Error("Unsupported public service type");
    if(!territory_id) throw new Error("Wilayah layanan wajib dipilih");

    const {data:territory,error:te}=await admin.from("territories")
      .select("id,name,territory_type,active")
      .eq("id",territory_id).eq("active",true).maybeSingle();
    if(te) throw te;
    if(!territory||territory.territory_type!=="VILLAGE") throw new Error("Wilayah layanan tidak valid");

    if(service_type==="HOUSEHOLD"){
      const applicant=text(p.applicant_name||p.head_name);
      const address=text(p.address);
      const rt=text(p.rt), rw=text(p.rw);
      if(!applicant||!address||!rt||!rw) throw new Error("F-1.02 memerlukan nama pemohon, alamat, RT dan RW");
      if(p.applicant_nik && !/^\d{16}$/.test(String(p.applicant_nik))) throw new Error("NIK Pemohon harus 16 digit");
      const members=Array.isArray(p.members)?p.members:[];
      if(members.some(m=>!m?.full_name)) throw new Error("Setiap anggota keluarga memerlukan nama lengkap");
      p.form_code="F-1.02";
      p.form_version="2026";
      p.result_form_code="F-1.09";
      p.compliance={canonical_form:"F-1.02",canonical_version:"2026",result_form:"F-1.09",mapping_version:"2026-09-30"};
      p.workflow={type:"HOUSEHOLD",initial_status:"SUBMITTED",required_stages:["RT_VERIFICATION","RW_REVIEW","DESA_VALIDATION","AUTHORIZED_PROCESSING"],source_form:"F-1.02",result_form:"F-1.09"};
    }

    const {data:record,error:re}=await admin.from("rt_service_requests").insert({
      territory_id,service_type,payload:p,status:"SUBMITTED",created_by:user.id,authority:"PUBLIC_PORTAL"
    }).select().single();
    if(re) throw re;

    await admin.from("audit_logs").insert({
      actor_user_id:user.id,
      action:service_type==="HOUSEHOLD"?"F1_02_PUBLIC_SUBMITTED":"PUBLIC_SERVICE_SUBMITTED",
      entity_type:"rt_service_requests",
      entity_id:record.id,
      scope_territory_id:territory_id,
      after_data:record,
      source:"SMART_VILLAGE_PUBLIC_PORTAL",
      authority:"PUBLIC_PORTAL"
    });

    return new Response(JSON.stringify({
      ok:true,record,
      form_code:service_type==="HOUSEHOLD"?"F-1.02":null,
      result_form_code:service_type==="HOUSEHOLD"?"F-1.09":null
    }),{headers:{...cors,"Content-Type":"application/json"}});
  }catch(e){
    return new Response(JSON.stringify({ok:false,error:String(e?.message||e)}),{
      status:400,headers:{...cors,"Content-Type":"application/json"}
    });
  }
});