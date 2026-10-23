import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveTransactionAuthorization, sanitizeSensitivePayload } from "../_shared/transaction-authorization.ts";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const CANONICAL=new Set(["BUSINESS","TRADE","EMPLOYMENT","EDUCATION","HEALTH","ENVIRONMENT","INFRASTRUCTURE","VOLUNTEER","PLANNING","DISASTER","ORGANIZATION"]);
const text=(v)=>v==null||v===""?null:String(v).trim()||null;
const num=(v)=>v==null||v===""?0:Number(v);
class HttpError extends Error { constructor(status:number,message:string){super(message);this.status=status;} status:number; }
const json=(body:unknown,status=200,requestId?:string)=>new Response(JSON.stringify({...body,...(requestId?{request_id:requestId}:{})}),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
async function hashNIK(v){if(!v)return null;const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(v).trim()));return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,"0")).join("")}
async function writeAudit(admin:any,row:any,requestId:string){const {error}=await admin.from("audit_logs").insert(row);if(error){console.error("[rt-transaction:audit]",requestId,error.message||"audit insert failed");return false;}return true;}
async function findPersonIdsByNIK(admin:any,nikValues:string[]){const unique=[...new Set(nikValues.filter(Boolean))];if(!unique.length)return new Map<string,string>();const hashes=await Promise.all(unique.map(hashNIK));const {data,error}=await admin.from("persons").select("id,national_id_hash").in("national_id_hash",hashes);if(error)throw error;return new Map((data||[]).filter(x=>x.national_id_hash).map(x=>[x.national_id_hash,x.id]));}
Deno.serve(async(req)=>{
 const requestId=crypto.randomUUID();
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({ok:false,error:"Method not allowed"},405,requestId);
 try{
  const auth=req.headers.get("Authorization"); if(!auth)throw new HttpError(401,"Authorization required");
  const anon=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});
  const {data:{user},error:ue}=await anon.auth.getUser(); if(ue||!user)throw new HttpError(401,"Authenticated user required");
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const declaredLength=Number(req.headers.get("content-length")||0);
  if(Number.isFinite(declaredLength)&&declaredLength>64*1024)return json({ok:false,error:"Request body exceeds 64 KiB"},413,requestId);
  const rawBody=await req.text();
  if(new TextEncoder().encode(rawBody).byteLength>64*1024)return json({ok:false,error:"Request body exceeds 64 KiB"},413,requestId);
  let body;try{body=JSON.parse(rawBody)}catch{return json({ok:false,error:"Invalid JSON body"},400,requestId)}
  if(!body||typeof body!=="object"||Array.isArray(body))throw new HttpError(400,"Request body must be a JSON object");
  const service_type=String(body.service_type||"").trim().toUpperCase(); const territory_id=String(body.territory_id||"").trim();
  if(!service_type||service_type.length>64||!territory_id||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(territory_id))throw new HttpError(400,"A valid service_type and territory_id are required");
  const rawPayload=body.payload;
  const p=sanitizeSensitivePayload(rawPayload) as Record<string,any>;
  if(!p||typeof p!=="object"||Array.isArray(p))throw new HttpError(400,"payload must be a JSON object");
  const {data:territory,error:te}=await admin.from("territories").select("id,territory_type,active,parent_id").eq("id",territory_id).maybeSingle();
  if(te)throw te;
  if(!territory||territory.active!==true)throw new HttpError(403,"Territory is not available for this action");
  const {data:assign,error:ae}=await admin.from("role_assignments").select("id,organization_id,active,starts_at,ends_at,roles(role_code)").eq("user_id",user.id).eq("scope_territory_id",territory_id).eq("active",true);
  if(ae)throw ae;
  const assignmentOrgIds=[...new Set((assign||[]).map(x=>x.organization_id).filter(Boolean))];
  const orgById=new Map<string,any>();
  if(assignmentOrgIds.length){
   const {data:orgs,error:oe}=await admin.from("organizations").select("id,active,territory_id").in("id",assignmentOrgIds);
   if(oe)throw oe;
   for(const org of orgs||[])orgById.set(org.id,org);
  }
  const allowedTerritoryIds=new Set<string>([territory.id]);
  let parentId=territory.parent_id||null;
  for(let depth=0;parentId&&depth<8&&!allowedTerritoryIds.has(parentId);depth++){
   const {data:parent,error:parentError}=await admin.from("territories").select("id,parent_id,active").eq("id",parentId).maybeSingle();
   if(parentError)throw parentError;
   if(!parent||parent.active!==true)break;
   allowedTerritoryIds.add(parent.id);parentId=parent.parent_id||null;
  }
  // Fail closed unless the assignment organization is active and mapped to this territory or an active ancestor.\n  const assignmentsWithOrg=(assign||[]).map(x=>({...x,organization_valid:Boolean(x.organization_id&&orgById.get(x.organization_id)?.active===true&&orgById.get(x.organization_id)?.territory_id&&allowedTerritoryIds.has(orgById.get(x.organization_id).territory_id))}));
  const decision=resolveTransactionAuthorization({territoryType:territory.territory_type,serviceType:service_type,assignments:assignmentsWithOrg,now:Date.now()});
  if(!decision.ok)throw new HttpError(decision.status,decision.reason);
  const scopedRoles=decision.scopedRoles;
  if(service_type==="HOUSEHOLD"){
    const applicant_name=text(p.applicant_name||p.head_name); const address=text(p.address); const rt=text(p.rt||p.RT); const rw=text(p.rw||p.RW);
    const request_kk=Boolean(p.request_kk||p.request_type);
    if(!applicant_name||!address||!rt||!rw||!request_kk)throw new HttpError(400,"F-1.02 requires applicant, address, RT, RW and KK request");
    const applicantNik=text(rawPayload.applicant_nik||rawPayload["NIK Pemohon"]);
    if(applicantNik && !/^\\d{16}$/.test(applicantNik))throw new HttpError(400,"NIK Pemohon must contain 16 digits");
    const members=Array.isArray(rawPayload.members)?rawPayload.members:[];
    if(members.length>50)throw new HttpError(400,"A household request can contain at most 50 members");
    if(members.some(m=>!m?.full_name))throw new HttpError(400,"Every household member requires full_name");
    const memberNiks=members.map(m=>text(m.nik||m.NIK||m["NIK Warga"]||m.national_id));
    if(memberNiks.some(value=>value&&!/^\\d{16}$/.test(value)))throw new HttpError(400,"Each member NIK, when provided, must contain 16 digits");
    const allNiks=[applicantNik,...memberNiks].filter((value):value is string=>Boolean(value));
    const personIdsByHash=await findPersonIdsByNIK(admin,allNiks);
    const hashByNik=new Map<string,string>();
    for(const nikValue of allNiks)hashByNik.set(nikValue,await hashNIK(nikValue));
    const applicantHash=applicantNik?hashByNik.get(applicantNik):undefined;
    const applicantPersonId=applicantHash?personIdsByHash.get(applicantHash)||null:null;
    const safeMembers=members.map((member,index)=>{
      const safeMember=sanitizeSensitivePayload(member) as Record<string,unknown>;
      const memberNik=memberNiks[index];
      const memberHash=memberNik?hashByNik.get(memberNik):undefined;
      const matchedPersonId=memberHash?personIdsByHash.get(memberHash)||null:null;
      return {...safeMember,...(matchedPersonId?{person_id:matchedPersonId}:{}),identity_resolution:memberNik?(matchedPersonId?"MATCHED_EXISTING_PERSON":"REQUIRES_VERIFICATION"):"REQUIRES_VERIFICATION"};
    });
    const canonical={canonical_form:"F-1.02",canonical_version:"2026",result_form:"F-1.09",mapping_version:"2026-09-29"};
    const workflow={type:"HOUSEHOLD",initial_status:"SUBMITTED",required_stages:["RT_VERIFICATION","RW_REVIEW","DESA_VALIDATION","AUTHORIZED_PROCESSING"],source_form:"F-1.02",result_form:"F-1.09"};
    const payload=sanitizeSensitivePayload({...(p as Record<string,unknown>),members:safeMembers,applicant_person_id:applicantPersonId,applicant_identity_resolution:applicantNik?(applicantPersonId?"MATCHED_EXISTING_PERSON":"REQUIRES_VERIFICATION"):"REQUIRES_VERIFICATION",form_code:"F-1.02",form_version:"2026",result_form_code:"F-1.09",request_type:p.request_kk||p.request_type||"Membentuk keluarga baru",applicant_name,compliance:canonical,workflow}) as Record<string,unknown>;
    const {data:record,error:re}=await admin.from("rt_service_requests").insert({territory_id,service_type,payload,status:"SUBMITTED",created_by:user.id,authority:"RT_DIGITAL"}).select().single();
    if(re)throw re;
    if(!(await writeAudit(admin,{actor_user_id:user.id,action:"F1_02_SUBMITTED",entity_type:"rt_service_requests",entity_id:record.id,scope_territory_id:territory_id,after_data:{request_number:record.request_number,service_type:record.service_type,status:record.status,form_code:"F-1.02",result_form_code:"F-1.09"},source:"GOVERNMENT_FORM_COMPLIANCE",authority:scopedRoles.join(",")},requestId)))return json({ok:false,error:"Submission was saved but audit confirmation failed. Do not resubmit; contact support using the request ID."},500,requestId);
    return json({ok:true,type:service_type,form_code:"F-1.02",result_form_code:"F-1.09",record},200,requestId);
  }
  let person_id=null; const nik=text(rawPayload.NIK||rawPayload["NIK Warga"]||rawPayload["NIK Pemohon"]||rawPayload["NIK Almarhum/Almarhumah"]);
  if(nik&&!/^\\d{16}$/.test(nik))throw new HttpError(400,"NIK must contain 16 digits");
  if(nik){const h=await hashNIK(nik);const {data:person,error:pe}=await admin.from("persons").select("id").eq("national_id_hash",h).maybeSingle();if(pe)throw pe;person_id=person?.id||null;}
  if(CANONICAL.has(service_type)){
    let table="",row={territory_id,created_by:user.id};
    if(service_type==="BUSINESS"){table="rt_business_profiles";row={...row,owner_person_id:person_id,business_name:text(p["Nama Usaha"]),business_type:text(p["Jenis Usaha"])||"LAINNYA",sector:text(p["Sektor"]),products_services:text(p["Produk/Jasa"]),scale:text(p["Skala Usaha"]),worker_count:num(p["Tenaga Kerja"]),sales_channels:text(p["Kanal Penjualan"]),licensing_status:text(p["Legalitas/Perizinan"]),needs:text(p["Kebutuhan Usaha"]),constraints:text(p["Kendala"]),potential:text(p["Potensi"]),verification_status:"SUBMITTED",classification:"INTERNAL",source:"RT_DIGITAL"};if(!row.business_name)throw new HttpError(400,"Nama Usaha wajib diisi");}
    if(service_type==="TRADE"){table="rt_trade_activities";row={...row,actor_name:text(p["Pelaku"]),trade_type:text(p["Jenis Perdagangan"])||"LAINNYA",products_services:text(p["Produk/Jasa"]),location_channel:text(p["Lokasi/Kanal"]),operating_hours:text(p["Jam Operasional"]),event_promotion:text(p["Event/Promosi"]),needs:text(p["Kebutuhan"]),status:"SUBMITTED",classification:"INTERNAL"}}
    if(service_type==="EMPLOYMENT"){table="rt_employment_profiles";row={...row,person_id,work_status:text(p["Status Kerja"])||"LAINNYA",occupation:text(p["Pekerjaan/Profesi"]),skills:text(p["Keahlian"]),certifications:text(p["Sertifikasi"]),training_needs:text(p["Kebutuhan Kerja/Pelatihan"]),verification_status:"SUBMITTED",classification:"CONFIDENTIAL"}}
    if(service_type==="EDUCATION"){table="rt_education_profiles";row={...row,person_id,education_status:text(p["Status Pendidikan"])||"LAINNYA",level_program:text(p["Jenjang/Program"]),skills:text(p["Keahlian"]),certifications:text(p["Sertifikasi"]),training_needs:text(p["Kebutuhan Pelatihan"]),verification_status:"SUBMITTED",classification:"CONFIDENTIAL"}}
    if(service_type==="HEALTH"){table="rt_health_observations";row={...row,person_id,observation_type:text(p["Jenis Kegiatan/Kebutuhan"])||"LAINNYA",observed_at:text(p["Tanggal"]),notes:text(p["Keterangan"]),referral_needed:false,verification_status:"SUBMITTED",classification:"SENSITIVE"}}
    if(service_type==="ENVIRONMENT"){table="rt_environment_issues";row={...row,issue_type:text(p["Jenis Issue"])||"LAINNYA",location_text:text(p["Lokasi"]),observed_at:text(p["Tanggal"]),description:text(p["Uraian"]),evidence_path:text(p["Bukti"]),status:"SUBMITTED"}}
    if(service_type==="INFRASTRUCTURE"){table="rt_infrastructure_assets";row={...row,object_name:text(p["Fasilitas/Objek"])||"Objek RT",object_type:text(p["Jenis"])||"LAINNYA",location_text:text(p["Lokasi"]),condition:text(p["Kondisi"]),needs:text(p["Kebutuhan"]),evidence_path:text(p["Bukti"]),status:"SUBMITTED"}}
    if(service_type==="VOLUNTEER"){table="rt_volunteer_profiles";row={...row,person_id,skills:text(p["Keahlian"]),certifications:text(p["Sertifikasi"]),volunteer_domain:text(p["Bidang Relawan"]),availability:text(p["Kesediaan"]),consent_note:text(p["Catatan"]),status:"SUBMITTED",classification:"CONFIDENTIAL"}}
    if(service_type==="PLANNING"){table="rt_planning_inputs";row={...row,input_type:text(p["Jenis Aspirasi/Usulan"])||"ASPIRASI",proposer:text(p["Pengusul"]),title:text(p["Judul"]),location_text:text(p["Lokasi"]),description:text(p["Uraian"]),priority:text(p["Prioritas"]),status:"SUBMITTED"};if(!row.title)throw new HttpError(400,"Judul usulan wajib diisi")}
    if(service_type==="DISASTER"){table="rt_disaster_observations";row={...row,event_type:text(p["Jenis Risiko/Kejadian"])||"LAINNYA",location_text:text(p["Lokasi"]),occurred_at:text(p["Tanggal/Waktu"]),evacuation_point:text(p["Titik Evakuasi"]),emergency_contact:text(p["Kontak Darurat"]),impact:text(p["Dampak"]),status:"SUBMITTED"}}
    if(service_type==="ORGANIZATION"){table="rt_organization_profiles";row={...row,name:text(p["Nama Organisasi/Komunitas"]),organization_type:text(p["Jenis"]),leaders:text(p["Pengurus"]),member_count:num(p["Jumlah Anggota"]),main_activities:text(p["Kegiatan Utama"]),status:text(p["Status"])||"ACTIVE"};if(!row.name)throw new HttpError(400,"Nama organisasi/komunitas wajib diisi")}
    const {data:record,error:re}=await admin.from(table).insert(row).select().single();if(re)throw re;
    if(!(await writeAudit(admin,{actor_user_id:user.id,action:"RT_CANONICAL_SUBMITTED",entity_type:table,entity_id:record.id,scope_territory_id:territory_id,after_data:{id:record.id,territory_id:record.territory_id,status:record.verification_status||record.status||"SUBMITTED",classification:record.classification||null},source:"RT_DIGITAL",authority:scopedRoles.join(",")},requestId)))return json({ok:false,error:"Submission was saved but audit confirmation failed. Do not resubmit; contact support using the request ID."},500,requestId);
    return json({ok:true,type:service_type,canonical:true,table,record},200,requestId);
  }
  const safePayload=sanitizeSensitivePayload(p);
  const {data:record,error:re}=await admin.from("rt_service_requests").insert({territory_id,service_type,payload:safePayload,status:"SUBMITTED",created_by:user.id,authority:"RT_DIGITAL"}).select().single();if(re)throw re;
  if(!(await writeAudit(admin,{actor_user_id:user.id,action:"RT_SERVICE_SUBMITTED",entity_type:"rt_service_requests",entity_id:record.id,scope_territory_id:territory_id,after_data:{id:record.id,territory_id:record.territory_id,service_type:record.service_type,status:record.status},source:"RT_DIGITAL",authority:scopedRoles.join(",")},requestId)))return json({ok:false,error:"Submission was saved but audit confirmation failed. Do not resubmit; contact support using the request ID."},500,requestId);
  return json({ok:true,type:"SERVICE_REQUEST",record},200,requestId);
 }catch(e){
  if(e instanceof HttpError)return json({ok:false,error:e.message},e.status,requestId);
  console.error("[rt-transaction]",requestId,e instanceof Error?e.message:"unknown internal error");
  return json({ok:false,error:"Internal server error. Reference the request ID when contacting support."},500,requestId);
 }
});