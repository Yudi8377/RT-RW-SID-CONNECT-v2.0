import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Content-Type":"application/json"};
const projectUrl=Deno.env.get("SUPABASE_URL")!, serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, admin=createClient(projectUrl,serviceKey);
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 try{
  const auth=req.headers.get("Authorization"); if(!auth) throw new Error("Authentication required");
  const token=auth.replace(/^Bearer\s+/i,""); const {data:{user},error}=await admin.auth.getUser(token);
  if(error||!user) throw new Error("Invalid authentication");
  const body=await req.json().catch(()=>({})); const action=body.action||"inquiry_list"; const territoryId=body.territory_id||"f06b8420-54f5-4ee4-b487-bacc7b374dd2";
  const t=await admin.from("territories").select("id,territory_type,active").eq("id",territoryId).eq("territory_type","VILLAGE").eq("active",true).maybeSingle();
  if(t.error||!t.data) throw new Error("Wilayah tidak valid atau tidak aktif");
  if(action==="inquiry_submit"){
   const p=body.payload||{}; if(!String(p.subject||"").trim()||!String(p.question||"").trim()) throw new Error("Subjek dan pertanyaan wajib diisi");
   const {data,error}=await admin.from("civic_inquiries").insert({territory_id:territoryId,created_by:user.id,subject:String(p.subject).trim(),question:String(p.question).trim(),category:String(p.category||"GENERAL").trim().toUpperCase()}).select().single();
   if(error) throw error; await admin.from("audit_logs").insert({actor_user_id:user.id,action:"CIVIC_INQUIRY_SUBMITTED",entity_type:"civic_inquiries",entity_id:data.id,source:"SMART_VILLAGE_PUBLIC_PORTAL",metadata:{territory_id:territoryId}});
   return new Response(JSON.stringify({ok:true,record:data}),{headers:cors});
  }
  if(action==="inquiry_list"){
   const {data,error}=await admin.from("civic_inquiries").select("id,subject,question,category,status,answer,created_at,updated_at").eq("territory_id",territoryId).eq("created_by",user.id).order("created_at",{ascending:false}).limit(50);
   if(error) throw error; return new Response(JSON.stringify({ok:true,records:data||[]}),{headers:cors});
  }
  if(action==="community_list"){
   const {data,error}=await admin.from("community_events").select("id,event_type,name,event_date,start_at,location,notes").eq("territory_id",territoryId).eq("public_visible",true).neq("status","CANCELLED").not("notes","ilike","%synthetic%").order("event_date",{ascending:true}).order("start_at",{ascending:true}).limit(50);
   if(error) throw error; return new Response(JSON.stringify({ok:true,records:data||[]}),{headers:cors});
  }
  if(action==="announcement_list"){
   const {data,error}=await admin.from("public_announcements").select("id,title,summary,content,category,published_at").eq("territory_id",territoryId).eq("status","PUBLISHED").order("published_at",{ascending:false}).limit(50);
   if(error) throw error; return new Response(JSON.stringify({ok:true,records:data||[]}),{headers:cors});
  }
  throw new Error("Unsupported action");
 }catch(e){return new Response(JSON.stringify({ok:false,error:e?.message||"Unexpected error"}),{status:400,headers:cors});}
});