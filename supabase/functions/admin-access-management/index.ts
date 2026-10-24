import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json",...cors}});

const allowedActions=new Set(["list","assign","deactivate"]);
const adminCodes=["PLATFORM_ADMIN"];

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  if(req.method!=="POST") return json({error:"Method not allowed"},405);

  const authHeader=req.headers.get("Authorization");
  if(!authHeader) return json({error:"Authorization required"},401);

  const url=Deno.env.get("SUPABASE_URL")!;
  const anonKey=Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient=createClient(url,anonKey,{global:{headers:{Authorization:authHeader}}});
  const {data:{user},error:userError}=await userClient.auth.getUser();
  if(userError||!user) return json({error:"Invalid session"},401);

  const admin=createClient(url,serviceKey);
  const {data:callerAssignments,error:callerError}=await admin
    .from("role_assignments").select("id,role_id,scope_territory_id,active,roles(role_code)")
    .eq("user_id",user.id).eq("active",true);
  if(callerError) return json({error:callerError.message},500);
  const isAdmin=(callerAssignments||[]).some((x:any)=>adminCodes.includes(x.roles?.role_code));
  if(!isAdmin) return json({error:"PLATFORM_ADMIN assignment required"},403);

  let body:any={};
  try{body=await req.json()}catch{}
  const action=String(body.action||"list");
  if(!allowedActions.has(action)) return json({error:"Unsupported action"},400);

  if(action==="list"){
    const {data,error}=await admin.from("role_assignments")
      .select("id,user_id,role_id,scope_territory_id,organization_id,active,starts_at,ends_at,roles(role_code,role_name),territories(name,territory_type)")
      .order("active",{ascending:false}).order("created_at",{ascending:false});
    if(error) return json({error:error.message},500);
    return json({assignments:data||[]});
  }

  const targetUserId=String(body.user_id||"");
  const roleCode=String(body.role_code||"");
  if(!targetUserId||!roleCode) return json({error:"user_id and role_code are required"},400);
  if(targetUserId===user.id) return json({error:"Self-escalation is not allowed"},403);

  const {data:role,error:roleError}=await admin.from("roles").select("id,role_code,critical").eq("role_code",roleCode).single();
  if(roleError||!role) return json({error:"Role not found"},400);

  if(action==="assign"){
    const scopeId=body.scope_territory_id?String(body.scope_territory_id):null;
    if(roleCode==="PLATFORM_ADMIN" && scopeId) return json({error:"PLATFORM_ADMIN must use global scope"},400);
    if(roleCode!=="PLATFORM_ADMIN" && !scopeId) return json({error:"Non-admin roles require a territory scope"},400);

    const {data:target,error:targetError}=await admin.auth.admin.getUserById(targetUserId);
    if(targetError||!target?.user) return json({error:"Target user not found"},404);

    const {data:existing,error:existingError}=await admin.from("role_assignments").select("id")
      .eq("user_id",targetUserId).eq("role_id",role.id).eq("active",true)
      .eq("scope_territory_id",scopeId);
    if(existingError) return json({error:existingError.message},500);
    if(existing?.length) return json({status:"already_assigned"});

    const {data:inserted,error:insertError}=await admin.from("role_assignments").insert({
      user_id:targetUserId,role_id:role.id,scope_territory_id:scopeId,
      active:true,starts_at:new Date().toISOString()
    }).select("id,user_id,role_id,scope_territory_id,active,starts_at,ends_at").single();
    if(insertError) return json({error:insertError.message},500);

    await admin.from("audit_logs").insert({
      actor_user_id:user.id,action:"ROLE_ASSIGNMENT_CREATED",entity_type:"role_assignment",
      entity_id:inserted.id,scope_territory_id:scopeId,
      after_data:{user_id:targetUserId,role_code:roleCode,scope_territory_id:scopeId},
      reason:String(body.reason||"Administrator access assignment"),
      source:"admin-access-management",authority:"PLATFORM_ADMIN"
    });
    return json({status:"assigned",assignment:inserted});
  }

  const assignmentId=String(body.assignment_id||"");
  if(!assignmentId) return json({error:"assignment_id is required"},400);
  const {data:current,error:currentError}=await admin.from("role_assignments")
    .select("id,user_id,role_id,scope_territory_id,active,roles(role_code)").eq("id",assignmentId).single();
  if(currentError||!current) return json({error:"Assignment not found"},404);
  if(current.user_id===user.id) return json({error:"Self-deactivation is not allowed"},403);
  if(!current.active) return json({status:"already_inactive"});

  const {data:updated,error:updateError}=await admin.from("role_assignments").update({
    active:false,ends_at:new Date().toISOString()
  }).eq("id",assignmentId).select("id,user_id,role_id,scope_territory_id,active,starts_at,ends_at").single();
  if(updateError) return json({error:updateError.message},500);

  await admin.from("audit_logs").insert({
    actor_user_id:user.id,action:"ROLE_ASSIGNMENT_DEACTIVATED",entity_type:"role_assignment",
    entity_id:assignmentId,scope_territory_id:current.scope_territory_id,
    before_data:{user_id:current.user_id,role_code:current.roles?.role_code,active:true},
    after_data:{user_id:current.user_id,role_code:current.roles?.role_code,active:false},
    reason:String(body.reason||"Administrator access deactivation"),
    source:"admin-access-management",authority:"PLATFORM_ADMIN"
  });
  return json({status:"deactivated",assignment:updated});
});