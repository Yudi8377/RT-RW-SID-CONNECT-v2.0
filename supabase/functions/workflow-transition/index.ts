import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const roleByAction={
 RT_VERIFY:["RT_OPERATOR","PLATFORM_ADMIN"],
 RW_REVIEW:["RW_REVIEWER","VILLAGE_VALIDATOR","PLATFORM_ADMIN"],
 RW_APPROVE:["RW_REVIEWER","VILLAGE_VALIDATOR","PLATFORM_ADMIN"],
 RW_CORRECT:["RW_REVIEWER","VILLAGE_VALIDATOR","PLATFORM_ADMIN"],
 VILLAGE_VALIDATE:["VILLAGE_VALIDATOR","PLATFORM_ADMIN"],
 VILLAGE_CORRECT:["VILLAGE_VALIDATOR","PLATFORM_ADMIN"],
 AUTHORIZE:["VILLAGE_VALIDATOR","PLATFORM_ADMIN"],
 RESUBMIT:["RT_OPERATOR","RW_REVIEWER","VILLAGE_VALIDATOR","PLATFORM_ADMIN"]
};
const allowed={
 SUBMITTED:["RT_VERIFY"],
 RT_VERIFIED:["RW_REVIEW","RW_CORRECT"],
 RW_REVIEW:["RW_APPROVE","RW_CORRECT"],
 VILLAGE_REVIEW:["VILLAGE_VALIDATE","VILLAGE_CORRECT"],
 VILLAGE_VALIDATED:["AUTHORIZE"],
 CORRECTION_REQUIRED:["RESUBMIT"]
};
const targets={RT_VERIFY:"RT_VERIFIED",RW_REVIEW:"RW_REVIEW",RW_APPROVE:"VILLAGE_REVIEW",RW_CORRECT:"CORRECTION_REQUIRED",VILLAGE_VALIDATE:"VILLAGE_VALIDATED",VILLAGE_CORRECT:"CORRECTION_REQUIRED",AUTHORIZE:"AUTHORIZED_PROCESSING",RESUBMIT:"SUBMITTED"};
const output=(p)=>({form_code:"F-1.09",form_version:"2026",source_form_code:"F-1.02",mapping_version:"2026-09-29",mapped_at:new Date().toISOString(),household_number:p.household_number||null,head_name:p.head_name||p.applicant_name||null,address:p.address||null,rt:p.rt||null,rw:p.rw||null,province:p.province||null,regency:p.regency||p.regency_city||null,district:p.district||null,village:p.village||null,hamlet:p.hamlet||null,members:Array.isArray(p.members)?p.members:[],result_status:"MAPPED_FOR_AUTHORIZED_PROCESSING"});
Deno.serve(async req=>{if(req.method==="OPTIONS")return new Response("ok",{headers:cors});try{
 const h=req.headers.get("Authorization");if(!h)throw Error("Authorization required");
 const anon=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:h}}});const {data:{user},error:ue}=await anon.auth.getUser();if(ue||!user)throw Error("Authenticated user required");
 const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);const b=await req.json();const type=String(b.entity_type||"");const id=String(b.entity_id||"");const territory=String(b.territory_id||"");const action=String(b.action||"").toUpperCase();const reason=b.reason?String(b.reason):null;
 if(!type||!id||!territory||!action)throw Error("entity_type, entity_id, territory_id and action are required");
 const {data:ra,error:re}=await admin.from("role_assignments").select("roles(role_code)").eq("user_id",user.id).eq("scope_territory_id",territory).eq("active",true);if(re)throw re;const roles=(ra||[]).map(x=>x.roles?.role_code).filter(Boolean);
 if(!(roleByAction[action]||[]).some(r=>roles.includes(r)))throw Error("Role is not authorized for this workflow action");
 const table=type.startsWith("rt_")?type:"rt_service_requests";const {data:row,error:fe}=await admin.from(table).select("*").eq("id",id).eq("territory_id",territory).maybeSingle();if(fe)throw fe;if(!row)throw Error("Record not found");
 const current=String(row.verification_status||row.status||"SUBMITTED");if(!(allowed[current]||[]).includes(action))throw Error("Invalid workflow transition from "+current+" using "+action);
 const next=targets[action];let patch=table==="rt_service_requests"?{status:next,updated_at:new Date().toISOString()}:(row.verification_status!==undefined?{verification_status:next,updated_at:new Date().toISOString()}:{status:next});
 if(action==="AUTHORIZE" && type==="rt_service_requests" && String(row.service_type).toUpperCase()==="HOUSEHOLD"){const p=row.payload||{};patch={...patch,payload:{...p,result_form_code:"F-1.09",result_form_version:"2026",result_form_mapping:output(p),authorized_processing_at:new Date().toISOString()}}}
 const {data:updated,error:ue2}=await admin.from(table).update(patch).eq("id",id).select().single();if(ue2)throw ue2;
 await admin.from("workflow_transitions").insert({entity_type:type,entity_id:id,territory_id:territory,from_status:current,to_status:next,actor_user_id:user.id,actor_role:roles.join(","),reason});
 await admin.from("audit_logs").insert({actor_user_id:user.id,action:"WORKFLOW_"+action,entity_type:type,entity_id:id,scope_territory_id:territory,before_data:row,after_data:updated,reason,source:"WORKFLOW_ENGINE",authority:roles.join(",")});
 return new Response(JSON.stringify({ok:true,action,from_status:current,to_status:next,form_code:type==="rt_service_requests"&&String(updated.service_type).toUpperCase()==="HOUSEHOLD"?"F-1.09":null,record:updated}),{headers:{...cors,"Content-Type":"application/json"}});
}catch(e){return new Response(JSON.stringify({ok:false,error:String(e?.message||e)}),{status:400,headers:{...cors,"Content-Type":"application/json"}})}});