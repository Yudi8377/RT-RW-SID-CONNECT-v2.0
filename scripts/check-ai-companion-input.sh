#!/usr/bin/env bash
set -euo pipefail

file="supabase/functions/ai-companion/index.ts"
test -f "$file"

# Client-provided context/history must never become model conversation state.
if grep -Eq 'body\.(history|context)|clientHistory' "$file"; then
  echo "Client-supplied history/context found in AI Companion" >&2
  exit 1
fi

# Preserve server-side authorization and bounded model execution.
grep -q 'authorizeCompanionRole' "$file"
grep -q 'AbortSignal.timeout(15000)' "$file"
grep -q 'OPENAI_MODEL.*gpt-4.1-mini' "$file"
grep -q 'input: \[' "$file"
grep -q 'role: "user", content: message' "$file"
grep -q 'typeof generated === "string" && generated.trim()' "$file"
grep -q 'Keep a safe role-specific fallback' "$file"

# Frontend must call only the hardened function and remain off until backend release.
grep -q 'sb.functions.invoke("ai-companion"' app.js
grep -q 'C.aiCompanionEnabled!==true' app.js
grep -q 'aiCompanionEnabled:false' config.js
grep -q 'state.companionMessages=\[\]' app.js

echo "AI Companion backend and frontend release-gate checks passed."
