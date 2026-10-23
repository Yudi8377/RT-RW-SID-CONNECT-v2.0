import {
  fallbackEmergencyAssessment,
  isEmergencyAssessment,
  parseEmergencyAssessmentReply,
} from "./emergency.ts";

Deno.test("recognizes the existing emergency assessment protocol", () => {
  if (!isEmergencyAssessment("EMERGENCY_ASSESSMENT korban merasa pusing")) {
    throw new Error("existing emergency prefix not recognized");
  }
  if (isEmergencyAssessment("Apa jadwal posyandu?")) {
    throw new Error("normal companion message incorrectly treated as emergency");
  }
});

Deno.test("model emergency reply parses NEED_HELP marker without speaking the marker", () => {
  const yes = parseEmergencyAssessmentReply("NEED_HELP=YES\nSaya akan menghubungkan bantuan sekarang.");
  if (!yes.needHelp || yes.reply.includes("NEED_HELP")) throw new Error("YES marker not parsed safely");
  const no = parseEmergencyAssessmentReply("NEED_HELP=NO\nJika kondisi berubah, minta bantuan.");
  if (no.needHelp || no.reply.includes("NEED_HELP")) throw new Error("NO marker not parsed safely");
});

Deno.test("malformed model output triggers human review", () => {
  const result = parseEmergencyAssessmentReply("Saya rasa Anda mungkin baik-baik saja.");
  if (!result.needHelp || result.reply.includes("baik-baik saja")) {
    throw new Error("malformed model output did not fail safe");
  }
});

Deno.test("explicitly safe transcript can return no-help only when clear", () => {
  const result = fallbackEmergencyAssessment("EMERGENCY_ASSESSMENT saya aman dan tidak butuh bantuan");
  if (result.needHelp) throw new Error("clear safe answer incorrectly escalated");
});

Deno.test("ambiguous emergency fallback escalates rather than diagnosing", () => {
  const result = fallbackEmergencyAssessment("EMERGENCY_ASSESSMENT saya tidak yakin dengan kondisi saya");
  if (!result.needHelp || !result.reply.includes("manusia")) {
    throw new Error("safe human-review fallback missing");
  }
});
