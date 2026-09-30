import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors={ "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods":"POST, OPTIONS" };
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
      await admin.from("citizen_location_events").update({active:false}).eq("user_id",user.id).eq("active",true);
      const expires=new Date(Date.now()+minutes*60000).toISOString();
      const {data,error:insertError}=await admin.from("citizen_location_events").insert({
        user_id:user.id,territory_id:territoryId,latitude:lat,longitude:lng,accuracy_m:accuracy,
        purpose:"EMERGENCY",reason:String(body.reason||"").slice(0,500)||null,expires_at:expires,active:true
      }).select("id,captured_at,expires_at,latitude,longitude,accuracy_m").single();
      if(insertError) throw insertError;
      await admin.from("audit_logs").insert({action:"EMERGENCY_LOCATION_SHARED",actor_user_id:user.id,territory_id:territoryId,metadata:{location_event_id:data.id,expires_at:expires}});
      return json({ok:true,event:data,message:"Lokasi darurat dibagikan selama "+minutes+" menit."});
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
      const allowed=assignments?.filter((a:any)=>a.role_code==="PLATFORM_ADMIN"||a.role_code==="RT_OPERATOR"||a.role_code==="RW_REVIEWER"||a.role_code==="VILLAGE_VALIDATOR").map((a:any)=>a.scope_territory_id).filter(Boolean)||[];
      if(ownAssignment.role_code!=="PLATFORM_ADMIN"&&!allowed.includes(event.territory_id)) return json({ok:false,error:"Emergency location di luar scope"},403);
      const {data:existing,error:existingError}=await admin.from("emergency_response_cases").select("*").eq("location_event_id",eventId).maybeSingle();
      if(existingError) throw existingError;
      let nextStatus=action==="acknowledge"?"ACKNOWLEDGED":action==="respond"?"RESPONDING":action==="resolve"?"RESOLVED":"CANCELLED";
      const now=new Date().toISOString();
      const patch:any={status:nextStatus,updated_at:now};
      if(action==="acknowledge"){patch.acknowledged_by=user.id;patch.acknowledged_at=now}
      if(action==="respond") patch.responding_at=now;
      if(action==="resolve"){patch.resolved_by=user.id;patch.resolved_at=now;patch.resolution_note=String(body.resolution_note||"").slice(0,1000)||null}
      if(existing){
        const {data:updated,error:updateError}=await admin.from("emergency_response_cases").update(patch).eq("id",existing.id).select("*").single();
        if(updateError) throw updateError;
        await admin.from("audit_logs").insert({action:"EMERGENCY_RESPONSE_"+nextStatus,actor_user_id:user.id,territory_id:event.territory_id,metadata:{case_id:existing.id,location_event_id:eventId}});
        return json({ok:true,case:updated});
      }
      if(action!=="acknowledge") return json({ok:false,error:"Kasus harus di-ACK terlebih dahulu"},409);
      const {data:created,error:createError}=await admin.from("emergency_response_cases").insert({location_event_id:event.id,territory_id:event.territory_id,status:"ACKNOWLEDGED",acknowledged_by:user.id,acknowledged_at:now}).select("*").single();
      if(createError) throw createError;
      await admin.from("audit_logs").insert({action:"EMERGENCY_RESPONSE_ACKNOWLEDGED",actor_user_id:user.id,territory_id:event.territory_id,metadata:{case_id:created.id,location_event_id:eventId}});
      return json({ok:true,case:created});
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