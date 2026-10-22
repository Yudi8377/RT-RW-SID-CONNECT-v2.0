RT/RW-SID-CONNECT Windows Launcher v2.0.1

STATUS
This package installs a desktop shortcut/launcher. It is NOT a native Windows application and it does NOT contain an offline copy of the SIM RT/RW application.

OFFICIAL APPLICATION
https://yudi8377.github.io/RT-RW-SID-CONNECT-v2.0/

REQUIREMENTS
- Windows desktop
- An internet connection
- A supported web browser

BEHAVIOR
- The launcher opens the official GitHub Pages application in the default browser.
- It does not install a local database, run a local server, or synchronize offline data.
- It does not activate a subscription or grant Pro/Enterprise permissions.
- Subscription entitlements and role/scope permissions must be enforced by the server; changing local files must never grant access.

KNOWN LIMITATION
Issue #43 tracks the separate product blocker: the current Windows package is a web launcher, not an operational offline/native SIM RT/RW OS. This change makes the launcher destination accurate and removes the unrelated Hatchable URL; it does not resolve the offline/native application requirement.

SECURITY
The installer is designed to run without administrator privileges. Do not put Supabase service-role keys, passwords, or other secrets in this package.
