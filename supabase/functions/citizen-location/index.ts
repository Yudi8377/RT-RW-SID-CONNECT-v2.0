import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors={ "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods":"POST, OPTIONS" };\nconst supabaseUrl="https://gzdusguveeeflmlvvmwe.supabase.co";
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin=createClient(supabaseUrl,serviceKey);

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  try{
    const auth=req.headers.get("Authorization")||"";
    if(!auth.startsWith("Bearer ")) return json({ok:false,error:"Authentication required"},401);
    const token=auth.replace("Bearer ","");
    const {data:{user},error:userErr}=await admin.auth.getUser(token);
    if(userErr||!user) return json({ok:false,error:"Invalid session"},401);

    const body=await req.json().catch(()=>({}));
    const action=body.action||"share";

    const {data:assignments,error:assignErr}=await admin.from("role_assignments")
      .select("id,role_code,scope_territory_id,active")
      .eq("user_id",user.id).eq("active",true);
    if(assignErr) throw assignErr;

    const ownAssignment=assignments?.find((a:any)=>["RT_OPERATOR","RW_REVIEWER","VILLAGE_VALIDATOR","PLATFORM_ADMIN"].includes(a.role_code));
    if(action==="share"){
      const territoryId=body.territory_id;
      const lat=Number(body.latitude), lng=Number(body.longitude), accuracy=body.accuracy_m==null?null:Number(body.accuracy_m);
      if(!territoryId || !Number.isFinite(lat)||!Number.isFinite(lng)) return json({ok:false,error:"Territory dan koordinat diperlukan"},400);
      const {data:territory,error:territoryError}=await admin.from("territories").select("id,territory_type,active").eq("id",territoryId).eq("active",true).maybeSingle();
      if(territoryError) throw territoryError;
      if(!territory || territory.territory_type!=="VILLAGE") return json({ok:false,error:"Wilayah berbagi lokasi tidak valid"},403);
      if(accuracy!==null && (!Number.isFinite(accuracy)||accuracy<0)) return json({ok:false,error:"Akurasi lokasi tidak valid"},400);
      const minutes=Math.min(Math.max(Number(body.duration_minutes||30),5),60);
      const priority=body.priority==="CRITICAL"?"CRITICAL":"HIGH";
      const slaMinutes=priority==="CRITICAL"?10:20;
      await admin.from("citizen_location_events").update({active:false}).eq("user_id",user.id).eq("active",true);
      const expires=new Date(Date.now()+minutes*60000).toISOString();
      const slaDue=new Date(Date.now()+slaMinutes*60000).toISOString();
      const {data:event,error:insertError}=await admin.from("citizen_location_events").insert({
        user_id:user.id,territory_id:territoryId,latitude:lat,longitude:lng,accuracy_m:accuracy,
        purpose:"EMERGENCY",reason:String(body.reason||"").slice(0,500)||null,expires_at:expires,active:true
      }).select("id,captured_at,expires_at,latitude,longitude,accuracy_m").single();
      if(insertError) throw insertError;
      const {data:caseRow,error:caseError}=await admin.from("emergency_response_cases").insert({
        location_event_id:event.id,territory_id:territoryId,status:"OPEN",priority,sla_due_at:slaDue,escalation_level:0
      }).select("*").single();
      if(caseError) throw caseError;
      await admin.from("emergency_response_events").insert({case_id:caseRow.id,status:"OPEN",note:"Kasus darurat dibuat dari lokasi warga."});
      await admin.from("emergency_notifications").insert({
        case_id:caseRow.id,territory_id:territoryId,target_role:"RT_OPERATOR",notification_type:"IN_APP",
        title:"Bantuan darurat baru",body:"Kasus EMG-"+String(event.id).slice(0,8).toUpperCase()+" memerlukan respons RT."
      });
      await admin.from("audit_logs").insert({action:"EMERGENCY_LOCATION_SHARED",actor_user_id:user.id,territory_id:territoryId,metadata:{location_event_id:event.id,case_id:caseRow.id,expires_at:expires,priority,sla_due_at:slaDue}});
      return json({ok:true,event,case:caseRow,message:"Lokasi darurat dibagikan selama "+minutes+" menit."});
    }

    if(action==="mine"){
      const {data,error}=await admin.from("citizen_location_events").select("id,territory_id,latitude,longitude,accuracy_m,captured_at,expires_at,reason,active")
        .eq("user_id",user.id).eq("active",true).gt("expires_at",new Date().toISOString()).order("captured_at",{ascending:false}).limit(1).maybeSingle();
      if(error) throw error;
      return json({ok:true,event:data||null});
    }

    if(["acknowledge","respond","resolve","cancel"].includes(action)){
      if(!ownAssignment) return json({ok:false,error:"Role emergency belum tersedia"},403);
      const eventId=String(body.location_event_id||"");
      if(!eventId) return json({ok:false,error:"location_event_id diperlukan"},400);
      const {data:event,error:eventError}=await admin.from("citizen_location_events").select("id,territory_id,active,expires_at").eq("id",eventId).maybeSingle();
      if(eventError) throw eventError;
      if(!event) return json({ok:false,error:"Emergency location tidak ditemukan"},404);
      const allowed=assignments?.filter((a:any)=>["PLATFORM_ADMIN","RT_OPERATOR","RW_REVIEWER","VILLAGE_VALIDATOR"].includes(a.role_code)).map((a:any)=>a.scope_territory_id).filter(Boolean)||[];
      if(ownAssignment.role_code!=="PLATFORM_ADMIN"&&!allowed.includes(event.territory_id)) return json({ok:false,error:"Emergency location di luar scope"},403);
      const {data:existing,error:existingError}=await admin.from("emergency_response_cases").select("*").eq("location_event_id",eventId).maybeSingle();
      if(existingError) throw existingError;
      if(!existing) return json({ok:false,error:"Kasus emergency belum tersedia"},409);
      const role=ownAssignment.role_code;
      const allowedByRole:any={acknowledge:["RT_OPERATOR","PLATFORM_ADMIN"],respond:["RW_REVIEWER","PLATFORM_ADMIN"],resolve:["VILLAGE_VALIDATOR","PLATFORM_ADMIN"],cancel:["RT_OPERATOR","RW_REVIEWER","VILLAGE_VALIDATOR","PLATFORM_ADMIN"]};
      if(!allowedByRole[action].includes(role)) return json({ok:false,error:"Role belum berwenang untuk tindakan ini"},403);
      const expected:any={acknowledge:"OPEN",respond:"ACKNOWLEDGED",resolve:"RESPONDING"};
      if(action!=="cancel"&&existing.status!==expected[action]) return json({ok:false,error:"Transisi status tidak valid"},409);
      if(action==="cancel"&&!["OPEN","ACKNOWLEDGED"].includes(existing.status)) return json({ok:false,error:"Kasus tidak dapat dibatalkan pada status ini"},409);
      const nextStatus=action==="acknowledge"?"ACKNOWLEDGED":action==="respond"?"RESPONDING":action==="resolve"?"RESOLVED":"CANCELLED";
      const now=new Date().toISOString();
      const patch:any={status:nextStatus,updated_at:now};
      if(action==="acknowledge"){patch.acknowledged_by=user.id;patch.acknowledged_at=now}
      if(action==="respond") patch.responding_at=now;
      if(action==="resolve"){patch.resolved_by=user.id;patch.resolved_at=now;patch.resolution_note=String(body.resolution_note||"").slice(0,1000)||null}
      const {data:updated,error:updateError}=await admin.from("emergency_response_cases").update(patch).eq("id",existing.id).select("*").single();
      if(updateError) throw updateError;
      await admin.from("emergency_response_events").insert({case_id:existing.id,status:nextStatus,note:action==="resolve"?String(body.resolution_note||"Kasus diselesaikan.").slice(0,1000):"Status diperbarui oleh "+role+"."});
      if(action==="acknowledge") await admin.from("emergency_notifications").insert({case_id:existing.id,territory_id:event.territory_id,target_role:"RW_REVIEWER",notification_type:"IN_APP",title:"Emergency menunggu review RW",body:"Kasus EMG-"+String(eventId).slice(0,8).toUpperCase()+" telah di-ACK oleh RT."});
      if(action==="respond") await admin.from("emergency_notifications").insert({case_id:existing.id,territory_id:event.territory_id,target_role:"VILLAGE_VALIDATOR",notification_type:"IN_APP",title:"Emergency menunggu validasi Desa",body:"Kasus EMG-"+String(eventId).slice(0,8).toUpperCase()+" sedang direspons."});
      await admin.from("audit_logs").insert({action:"EMERGENCY_RESPONSE_"+nextStatus,actor_user_id:user.id,territory_id:event.territory_id,metadata:{case_id:existing.id,location_event_id:eventId}});
      return json({ok:true,case:updated});
    }

    if(action==="command"){
      if(!ownAssignment) return json({ok:false,error:"Role emergency belum tersedia"},403);
      const requested=body.territory_id;
      const roleNames=assignments?.filter((a:any)=>["RT_OPERATOR","RW_REVIEWER","VILLAGE_VALIDATOR","PLATFORM_ADMIN"].includes(a.role_code)).map((a:any)=>a.role_code)||[];
      const isAdmin=roleNames.includes("PLATFORM_ADMIN");
      const allowedTerritories=assignments?.filter((a:any)=>["RT_OPERATOR","RW_REVIEWER","VILLAGE_VALIDATOR","PLATFORM_ADMIN"].includes(a.role_code)).map((a:any)=>a.scope_territory_id).filter(Boolean)||[];
      let cq=admin.from("emergency_response_cases").select("*").order("created_at",{ascending:false});
      if(!isAdmin) cq=cq.in("territory_id",allowedTerritories);
      if(requested) cq=cq.eq("territory_id",requested);
      const {data:cases,error:caseError}=await cq.limit(100);
      if(caseError) throw caseError;
      const ids=(cases||[]).map((x:any)=>x.id);
      let events:any[]=[]; let notifications:any[]=[];
      if(ids.length){
        const er=await admin.from("emergency_response_events").select("id,case_id,status,note,created_at").in("case_id",ids).order("created_at",{ascending:true});
        if(er.error) throw er.error; events=er.data||[];
        let nq=admin.from("emergency_notifications").select("id,case_id,territory_id,target_role,notification_type,title,body,status,created_at,read_at").in("case_id",ids).order("created_at",{ascending:false});
        if(!isAdmin) nq=nq.in("target_role",roleNames);
        const nr=await nq.limit(200); if(nr.error) throw nr.error; notifications=nr.data||[];
      }
      return json({ok:true,role_names:roleNames,cases:cases||[],events,notifications});
    }

    if(action==="report"){
      if(!ownAssignment) return json({ok:false,error:"Role emergency belum tersedia"},403);
      const requested=body.territory_id;
      const roleNames=assignments?.filter((a:any)=>["RT_OPERATOR","RW_REVIEWER","VILLAGE_VALIDATOR","PLATFORM_ADMIN"].includes(a.role_code)).map((a:any)=>a.role_code)||[];
      const isAdmin=roleNames.includes("PLATFORM_ADMIN");
      const allowedTerritories=assignments?.filter((a:any)=>["RT_OPERATOR","RW_REVIEWER","VILLAGE_VALIDATOR","PLATFORM_ADMIN"].includes(a.role_code)).map((a:any)=>a.scope_territory_id).filter(Boolean)||[];
      let cq=admin.from("emergency_response_cases").select("*").order("created_at",{ascending:false});
      if(!isAdmin) cq=cq.in("territory_id",allowedTerritories);
      if(requested) cq=cq.eq("territory_id",requested);
      const {data:cases,error:caseError}=await cq.limit(500);
      if(caseError) throw caseError;
      const ids=(cases||[]).map((x:any)=>x.id);
      let events:any[]=[]; let notifications:any[]=[];
      if(ids.length){
        const er=await admin.from("emergency_response_events").select("id,case_id,status,note,created_at").in("case_id",ids).order("created_at",{ascending:true});
        if(er.error) throw er.error; events=er.data||[];
        let nq=admin.from("emergency_notifications").select("id,case_id,territory_id,target_role,notification_type,title,body,status,created_at,read_at").in("case_id",ids).order("created_at",{ascending:false});
        if(!isAdmin) nq=nq.in("target_role",roleNames);
        const nr=await nq.limit(1000); if(nr.error) throw nr.error; notifications=nr.data||[];
      }
      const now=Date.now();
      const byStatus:any={OPEN:0,ACKNOWLEDGED:0,RESPONDING:0,RESOLVED:0,CANCELLED:0};
      let breaches=0, escalated=0, ackTotal=0, ackCount=0, resolutionTotal=0, resolutionCount=0;
      for(const c of (cases||[])){
        if(byStatus[c.status]!==undefined) byStatus[c.status]++;
        if(Number(c.escalation_level||0)>0) escalated++;
        if(c.sla_due_at && new Date(c.sla_due_at).getTime() < (c.acknowledged_at?new Date(c.acknowledged_at).getTime():now) && !["RESOLVED","CANCELLED"].includes(c.status)) breaches++;
        if(c.acknowledged_at){ackTotal+=new Date(c.acknowledged_at).getTime()-new Date(c.created_at).getTime();ackCount++}
        if(c.resolved_at){resolutionTotal+=new Date(c.resolved_at).getTime()-new Date(c.created_at).getTime();resolutionCount++}
      }
      const notificationCounts:any={PENDING:0,DELIVERED:0,READ:0,DISMISSED:0};
      for(const n of notifications) if(notificationCounts[n.status]!==undefined) notificationCounts[n.status]++;
      const recentEvents=events.slice(-100).reverse().map((e:any)=>({case_code:"EMG-"+String((cases||[]).find((c:any)=>c.id===e.case_id)?.location_event_id||e.case_id).slice(0,8).toUpperCase(),status:e.status,note:e.note,created_at:e.created_at}));
      return json({ok:true,scope:{role_names:roleNames,territory_id:requested||null},summary:{
        total_cases:(cases||[]).length,...byStatus,sla_breaches:breaches,escalated_cases:escalated,
        avg_ack_minutes:ackCount?Math.round(ackTotal/ackCount/60000):0,
        avg_resolution_minutes:resolutionCount?Math.round(resolutionTotal/resolutionCount/60000):0,
        notification_counts:notificationCounts
      },timeline:recentEvents});
    }

    if(action==="active"){
      if(!ownAssignment) return json({ok:false,error:"Role emergency belum tersedia"},403);
      const requested=body.territory_id;
      const allowedTerritories=assignments?.filter((a:any)=>a.role_code==="PLATFORM_ADMIN"||a.role_code==="RT_OPERATOR"||a.role_code==="RW_REVIEWER"||a.role_code==="VILLAGE_VALIDATOR").map((a:any)=>a.scope_territory_id).filter(Boolean);
      let q=admin.from("citizen_location_events").select("id,user_id,territory_id,latitude,longitude,accuracy_m,captured_at,expires_at,reason,emergency_response_cases(status,priority,sla_due_at)").eq("active",true).gt("expires_at",new Date().toISOString()).order("captured_at",{ascending:false});
      if(ownAssignment.role_code!=="PLATFORM_ADMIN") q=q.in("territory_id",allowedTerritories||[]);
      if(requested) q=q.eq("territory_id",requested);
      const {data,error}=await q.limit(100);
      if(error) throw error;
      const records=(data||[]).map((x:any)=>({
        id:x.id,
        case_code:"EMG-"+String(x.id).slice(0,8).toUpperCase(),
        territory_id:x.territory_id,
        latitude:x.latitude,
        longitude:x.longitude,
        accuracy_m:x.accuracy_m,
        captured_at:x.captured_at,
        expires_at:x.expires_at,
        reason:x.reason
      }));
      return json({ok:true,records});
    }
    return json({ok:false,error:"Unsupported action"},400);
  }catch(e){ return json({ok:false,error:e?.message||"Unexpected error"},500); }
});