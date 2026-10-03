import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
type Operator = "eq"|"neq"|"gt"|"gte"|"lt"|"lte"|"in"|"exists";
type RuleExpression = {fact?:string;op?:Operator;value?:unknown;all?:RuleExpression[];any?:RuleExpression[]};
const allowedRoles=new Set(["RT_OPERATOR","RW_REVIEWER","VILLAGE_VALIDATOR","PLATFORM_ADMIN"]);
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});}
function compare(e:RuleExpression,f:Record<string,unknown>):boolean|null{
 if(e.all){const r=e.all.map(x=>compare(x,f));return r.every(x=>x===true)?true:r.some(x=>x===null)?null:false;}
 if(e.any){const r=e.any.map(x=>compare(x,f));return r.some(x=>x===true)?true:r.some(x=>x===null)?null:false;}
 if(!e.fact||!e.op)return null; const o=f[e.fact];
 if(e.op==="exists")return Object.prototype.hasOwnProperty.call(f,e.fact);
 if(o===undefined||o===null)return null;
 switch(e.op){case"eq":return o===e.value;case"neq":return o!==e.value;case"gt":return typeof o==="number"&&typeof e.value==="number"?o>e.value:null;case"gte":return typeof o==="number"&&typeof e.value==="number"?o>=e.value:null;case"lt":return typeof o==="number"&&typeof e.value==="number"?o<e.value:null;case"lte":return typeof o==="number"&&typeof e.value==="number"?o<=e.value:null;case"in":return Array.isArray(e.value)?e.value.includes(o):null;default:return null;}
}
function collect(e:RuleExpression,s:Set<string>){if(e.fact)s.add(e.fact);e.all?.forEach(x=>collect(x,s));e.any?.forEach(x=>collect(x,s));}
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405);
 const auth=req.headers.get("authorization");if(!auth)return json({error:"UNAUTHORIZED"},401);
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_ANON_KEY");if(!url||!key)return json({error:"CONFIGURATION_ERROR"},500);
 const supabase=createClient(url,key,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:ue}=await supabase.auth.getUser();if(ue||!user)return json({error:"UNAUTHORIZED"},401);
 let body:{application_id?:string;facts?:Record<string,unknown>};try{body=await req.json();}catch{return json({error:"INVALID_JSON"},400);}
 if(!body.application_id||!/^[0-9a-f-]{36}$/i.test(body.application_id))return json({error:"INVALID_APPLICATION_ID"},400);
 const facts=body.facts&&typeof body.facts==="object"?body.facts:{};
 const {data:app,error:ae}=await supabase.from("assistance_applications").select("id,program_id,territory_id,eligibility_status,workflow_status").eq("id",body.application_id).maybeSingle();
 if(ae||!app)return json({error:"APPLICATION_NOT_FOUND"},404);
 const {data:assignments,error:re}=await supabase.from("role_assignments").select("scope_territory_id,active,roles(role_code)").eq("user_id",user.id).eq("active",true);
 if(re)return json({error:"ROLE_LOOKUP_FAILED"},500);
 const scoped=(assignments??[]).some((a:any)=>a.scope_territory_id===app.territory_id&&allowedRoles.has(a.roles?.role_code));
 if(!scoped)return json({error:"FORBIDDEN"},403);
 const {data:program,error:pe}=await supabase.from("government_programs").select("id,program_code,program_name,status,version,effective_from,effective_to").eq("id",app.program_id).maybeSingle();
 if(pe||!program)return json({error:"PROGRAM_NOT_FOUND"},404);
 if(program.status!=="ACTIVE")return json({error:"PROGRAM_NOT_ACTIVE"},409);
 const today=new Date().toISOString().slice(0,10);if((program.effective_from&&today<program.effective_from)||(program.effective_to&&today>program.effective_to))return json({error:"PROGRAM_OUTSIDE_EFFECTIVE_PERIOD"},409);
 const {data:rules,error:re2}=await supabase.from("government_program_rules").select("id,rule_code,rule_type,rule_expression,explanation,legal_reference,priority,active").eq("program_id",program.id).eq("active",true).order("priority",{ascending:true});
 if(re2)return json({error:"RULE_LOOKUP_FAILED"},500);
 const results=(rules??[]).map((r:any)=>{const result=compare(r.rule_expression as RuleExpression,facts);const keys=new Set<string>();collect(r.rule_expression as RuleExpression,keys);return{rule_id:r.id,rule_code:r.rule_code,rule_type:r.rule_type,result:result===true?"PASS":result===false?"FAIL":"UNKNOWN",explanation:r.explanation??null,legal_reference:r.legal_reference??{},fact_keys:[...keys]};});
 const unknown=results.some(r=>r.result==="UNKNOWN"),fail=results.some(r=>r.result==="FAIL");
 const candidateStatus=unknown?"REVIEW_REQUIRED":fail?"CANDIDATE_MISMATCH":"CANDIDATE_MATCH";
 const factKeys=[...new Set(results.flatMap(r=>r.fact_keys))];
 const {data:evaluation,error:ie}=await supabase.from("assistance_rule_evaluations").insert({application_id:app.id,program_id:program.id,territory_id:app.territory_id,candidate_status:candidateStatus,rule_results:results.map(({fact_keys,...r})=>r),rule_snapshot:{program_code:program.program_code,program_version:program.version},fact_keys:factKeys,decision_support_only:true,evaluated_by:user.id}).select("id,candidate_status,rule_results,rule_snapshot,fact_keys,decision_support_only,created_at").single();
 if(ie)return json({error:"EVALUATION_PERSIST_FAILED"},500);
 return json({evaluation,application_workflow_status:app.workflow_status,final_eligibility_decision:null,decision_support_only:true});
});