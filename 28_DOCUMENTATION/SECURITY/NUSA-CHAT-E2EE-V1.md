# NUSA CHAT — E2EE v1 Security Contract

## Purpose
NUSA CHAT is the private communication layer of RT/RW-SID CONNECT. It is designed so ordinary message content is encrypted before it reaches Supabase.

## What is encrypted
- Text message content.
- Future media payloads must be encrypted on-device before upload.
- Message envelopes contain ciphertext only.

## Key model v1
Each installed device creates a long-lived Curve25519 key pair using TweetNaCl and stores the private key in Expo SecureStore. Public keys are registered in `sv_chat_devices`.

For every message, the sender creates an ephemeral key pair and a random nonce. The message is encrypted separately for each active recipient device with `nacl.box`. The ephemeral public key is stored alongside the ciphertext; the ephemeral private key remains only in device memory for that send operation.

This provides authenticated device-to-device encryption without putting plaintext into the database.

## Important security boundary
This is **E2EE v1**, not a claim of Signal/WhatsApp protocol equivalence. The next security milestone should add a ratcheting session protocol, key-change verification and multi-device session management before making a stronger cryptographic equivalence claim.

Administrators, RT, RW and village operators do not receive a server-side plaintext decryption path for personal chat.

## Database controls
- RLS is enabled on all NUSA CHAT tables.
- Conversation membership is checked through a scoped security-definer helper in the non-exposed `private` schema to avoid recursive RLS.
- Sender device ownership is enforced by a database trigger.
- Envelope insertion is restricted to devices belonging to conversation members.
- Recipient discovery requires an authenticated session and an exact phone-number match.
- Profile avatars are stored in a private Storage bucket and displayed through short-lived signed URLs.

## Product privacy rules
Personal chat is not automatically readable by RT/RW/Desa/Admin.
Moderation/reporting can record the existence of a report and metadata needed for governance, but the platform should not create a hidden plaintext backdoor.

## Release acceptance
A release candidate must test with two real accounts on two Android devices:
1. Register/login both users.
2. Open NUSA CHAT on both devices.
3. Start a direct conversation using exact phone lookup.
4. Send messages both directions.
5. Confirm each device decrypts its own envelope.
6. Confirm the Supabase `sv_chat_messages` rows contain no plaintext.
7. Confirm the `sv_chat_message_envelopes` rows contain ciphertext and nonce only.
8. Confirm logout/re-login retains the device key and conversation history.
9. Confirm a non-member cannot select conversation messages or envelopes.
10. Confirm profile avatar upload, private storage, signed URL display and replacement.

## Planned v2 security work
- Ratcheting sessions.
- Key-change safety number / QR verification.
- Multi-device key hierarchy.
- Encrypted media attachments.
- Encrypted local cache.
- Secure backup with user-held recovery key.
- Group sender-key optimization.
- Independent cryptographic review before public security claims.
