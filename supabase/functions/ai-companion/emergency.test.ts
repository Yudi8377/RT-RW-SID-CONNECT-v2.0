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

Deno.test("ambiguous emergency fallback escalates rather than diagnosing", () => {
  const result = fallbackEmergencyAssessment("EMERGENCY_ASSESSMENT saya tidak yakin dengan kondisi saya");
  if (!result.needHelp || !result.reply.includes("manusia")) {
    throw new Error("safe human-review fallback missing");
  }
});
