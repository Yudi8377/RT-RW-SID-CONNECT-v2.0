export function isEmergencyAssessment(message: string): boolean {
  return message.startsWith("EMERGENCY_ASSESSMENT");
}

export function fallbackEmergencyAssessment(message: string): { needHelp: boolean; reply: string } {
  const transcript = message.replace(/^EMERGENCY_ASSESSMENT\\s*/i, "").trim();
  const danger = /(tolong|butuh bantuan|terluka|cedera|berdarah|tidak bisa bergerak|sesak|pingsan|sakit sekali|darurat)/i.test(transcript);
  const explicitlySafe = /(saya aman|tidak butuh bantuan|tidak perlu bantuan|saya baik-baik saja|saya tidak terluka|saya bisa berjalan)/i.test(transcript);
  // Emergency assessment fails safe: uncertain or empty answers trigger human review.
  const needHelp = danger || !explicitlySafe;
  return {
    needHelp,
    reply: needHelp
      ? "Saya mendengar Anda mungkin membutuhkan bantuan. Saya akan menghubungkan permintaan bantuan darurat agar petugas manusia dapat memeriksa."
      : "Saya belum yakin dengan kondisi Anda. Jika Anda merasa tidak aman atau ragu, minta bantuan manusia sekarang.",
  };
}

export function parseEmergencyAssessmentReply(raw: string): { needHelp: boolean; reply: string } {
  const needHelp = /^\s*NEED_HELP\s*=\s*YES\b/i.test(raw);
  const reply = raw.replace(/^\s*NEED_HELP\s*=\s*(YES|NO)\s*/i, "").trim();
  return {
    needHelp,
    reply: reply || "Saya belum yakin dengan kondisi Anda. Saya akan meminta petugas manusia memeriksa keadaan Anda.",
  };
}
