# Smart Village Mobile Design Contract

## Product
RT/RW-SID CONNECT v2.0 — Smart Village / Desa Cerdas Engine mobile client.

## Audience
Warga first; the same authenticated shell will progressively expose RT, RW, and Kelurahan/Desa capabilities according to backend role and wilayah scope.

## Visual direction
A civic-premium interface: deep forest ink for authority, warm paper for the working surface, and a restrained mint signal for verified/community states. The signature is the **Civic Pulse**: a compact status strip showing wilayah, verification state, and the next useful action.

## Tokens
- Ink: #16352C
- Ink soft: #5F716A
- Paper: #F6F4EE
- Surface: #FFFFFF
- Mist: #E7EFEA
- Signal: #3D806D
- Line: #DFE5E1
- Danger: #A63D3D
- Radius: 18–28
- Screen gutter: 20
- Bottom navigation reserve: 92

## Typography
System sans-serif for reliable Android/iOS rendering. Strong 28–32pt display, 16–18pt section headings, 13–14pt body, 10–11pt utility labels.

## Navigation
Beranda / Layanan / Kabar / Agenda / Warga.

## Behavioral rules
- Public information remains browseable without authentication.
- Authentication is required only for private actions and personalized records.
- No trial wall in the mobile public experience.
- Backend authorization remains authoritative; UI must never infer or grant RT/RW/Kelurahan permissions.
- Loading, empty, error, and signed-out states keep stable geometry.
- Private data is never rendered as public content.
