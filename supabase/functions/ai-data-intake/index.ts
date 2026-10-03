import { withSupabase } from "npm:@supabase/server@1";

type Input = {
  batch_id?: string;
  source_type?: string;
  content?: string;
  delimiter?: string;
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const aliases: Record<string, { target: string; confidence: number }> = {
  nik: { target: "nik", confidence: 1 },
  nomornik: { target: "nik", confidence: 0.98 },
  "no nik": { target: "nik", confidence: 0.98 },
  kk: { target: "kk", confidence: 1 },
  "nomor kk": { target: "kk", confidence: 0.98 },
  nomorkk: { target: "kk", confidence: 0.98 },
  nama: { target: "name", confidence: 1 },
  "nama lengkap": { target: "name", confidence: 1 },
  namalengkap: { target: "name", confidence: 1 },
  alamat: { target: "address", confidence: 1 },
  "tempat lahir": { target: "birth_place", confidence: 0.98 },
  "tanggal lahir": { target: "birth_date", confidence: 0.98 },
  "jenis kelamin": { target: "gender", confidence: 0.98 },
  jk: { target: "gender", confidence: 0.95 },
  "no hp": { target: "phone", confidence: 0.95 },
  "nomor hp": { target: "phone", confidence: 0.95 },
  telepon: { target: "phone", confidence: 0.95 },
};

function keyOf(value: string) {
  return value.trim().toLowerCase().replace(/[._/-]+/g, " ").replace(/\s+/g, " ");
}

function parseCsv(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"' && quoted && next === '"') {
      cell += '"'; i++; continue;
    }
    if (ch === '"') { quoted = !quoted; continue; }
    if (ch === delimiter && !quoted) { row.push(cell); cell = ""; continue; }
    if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value.replace(/\D/g, ""));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST") return Response.json({ ok: false, error: "METHOD_NOT_ALLOWED" }, { status: 405, headers: cors });

    const body = (await req.json()) as Input;
    if (!body.batch_id) return Response.json({ ok: false, error: "BATCH_ID_REQUIRED" }, { status: 400, headers: cors });

    const { data: batch, error: batchError } = await ctx.supabase
      .from("data_intake_batches")
      .select("id,territory_id,source_type,status,created_by,source_name")
      .eq("id", body.batch_id)
      .single();

    if (batchError || !batch) return Response.json({ ok: false, error: "BATCH_NOT_FOUND_OR_FORBIDDEN" }, { status: 404, headers: cors });

    const sourceType = String(body.source_type || batch.source_type).toUpperCase();
    if (!["CSV", "MANUAL"].includes(sourceType)) {
      return Response.json({
        ok: false,
        status: "PROVIDER_REQUIRED",
        source_type: sourceType,
        message: "PDF/IMAGE/SCAN/EXCEL extraction requires an approved extraction provider or parser. No automatic sensitive-data commit is performed.",
      }, { status: 422, headers: cors });
    }
    if (!body.content) return Response.json({ ok: false, error: "CONTENT_REQUIRED" }, { status: 400, headers: cors });

    const rows = parseCsv(body.content, body.delimiter || ",");
    if (rows.length < 2) return Response.json({ ok: false, error: "CSV_HEADER_OR_ROWS_MISSING" }, { status: 422, headers: cors });

    const headers = rows[0].map(keyOf);
    const mappings = headers.map((sourceField) => aliases[sourceField] ? ({
      batch_id: batch.id,
      source_field: sourceField,
      target_field: aliases[sourceField].target,
      confidence: aliases[sourceField].confidence,
      mapping_source: "SYSTEM",
      approved: false,
    }) : null).filter(Boolean);

    await ctx.supabaseAdmin.from("data_intake_field_mappings").delete().eq("batch_id", batch.id);
    if (mappings.length) {
      const { error } = await ctx.supabaseAdmin.from("data_intake_field_mappings").insert(mappings);
      if (error) return Response.json({ ok: false, error: "MAPPING_WRITE_FAILED", detail: error.message }, { status: 500, headers: cors });
    }

    await ctx.supabaseAdmin.from("data_intake_batches").update({ status: "EXTRACTING", row_count: rows.length - 1 }).eq("id", batch.id);

    const seen = new Set<string>();
    const records = [];
    let matched = 0;
    let conflicts = 0;
    let review = 0;

    for (let index = 1; index < rows.length; index++) {
      const row = rows[index];
      const normalized: Record<string, string> = {};
      for (let col = 0; col < headers.length; col++) {
        const mapping = aliases[headers[col]];
        if (mapping && row[col] !== undefined) normalized[mapping.target] = row[col].trim();
      }

      const nik = (normalized.nik || "").replace(/\D/g, "");
      const kk = (normalized.kk || "").replace(/\D/g, "");
      const fingerprint = nik || kk ? [nik, kk].join("|") : JSON.stringify(normalized);
      const duplicate = seen.has(fingerprint);
      seen.add(fingerprint);

      let personId: string | null = null;
      let householdId: string | null = null;
      if (nik) {
        const hash = await sha256Hex(nik);
        const p = await ctx.supabaseAdmin.from("persons").select("id").eq("national_id_hash", hash).maybeSingle();
        personId = p.data?.id || null;
      }
      if (kk) {
        const hash = await sha256Hex(kk);
        const h = await ctx.supabaseAdmin.from("households").select("id").eq("household_number_hash", hash).maybeSingle();
        householdId = h.data?.id || null;
      }

      const exactMatch = !!personId || !!householdId;
      const status = duplicate ? "POSSIBLE_DUPLICATE" : exactMatch ? "MATCHED" : "REVIEW_REQUIRED";
      if (status === "MATCHED") matched++;
      if (status === "POSSIBLE_DUPLICATE") conflicts++;
      if (status === "REVIEW_REQUIRED") review++;

      records.push({
        batch_id: batch.id,
        source_row_number: index + 1,
        extracted_data: Object.fromEntries(Object.entries(normalized)),
        normalized_data: Object.fromEntries(Object.entries(normalized).filter(([k]) => !["nik", "kk"].includes(k))),
        match_status: status,
        confidence: duplicate ? 0.5 : exactMatch ? 0.99 : 0.25,
        matched_person_id: personId,
        matched_household_id: householdId,
      });
    }

    await ctx.supabaseAdmin.from("data_intake_records").delete().eq("batch_id", batch.id);
    const { error: recordError } = await ctx.supabaseAdmin.from("data_intake_records").insert(records);
    if (recordError) return Response.json({ ok: false, error: "RECORD_WRITE_FAILED", detail: recordError.message }, { status: 500, headers: cors });

    const status = review || conflicts ? "REVIEW" : "COMPLETED";
    await ctx.supabaseAdmin.from("data_intake_batches").update({
      status, accepted_count: matched, review_count: review, conflict_count: conflicts,
    }).eq("id", batch.id);

    return Response.json({
      ok: true,
      batch_id: batch.id,
      source_type: sourceType,
      rows: records.length,
      matched,
      review,
      conflicts,
      mapping_count: mappings.length,
      next_step: review || conflicts ? "OPERATOR_REVIEW" : "READY_FOR_APPROVAL",
      ai_provider: "NOT_CONFIGURED",
      decision_support_only: true,
    }, { headers: cors });
  }),
};
