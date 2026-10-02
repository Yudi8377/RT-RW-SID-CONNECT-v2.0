const fs = require("fs");
const os = require("os");
const path = require("path");
const cp = require("child_process");

const installDir = path.join(process.env.RUNNER_TEMP || os.tmpdir(), "RT-RW-SID-CONNECT-acceptance");
const userData = path.join(process.env.APPDATA, "rt-rw-sid-connect-desktop");
const dbPath = path.join(userData, "data", "rt-rw-sid-connect.sqlite");

function fail(message) { console.error(JSON.stringify({ ok:false, error:message }, null, 2)); process.exit(1); }
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
function run(command, args) {
  const r = cp.spawnSync(command, args, { stdio:"inherit", windowsHide:true });
  if (r.status !== 0) fail(`${command} exited with ${r.status}`);
}
function findInstaller() {
  const files = fs.readdirSync(path.join(__dirname, "dist")).filter(x => x.toLowerCase().endsWith(".exe") && !x.toLowerCase().startsWith("uninstall"));
  if (!files.length) fail("Installer EXE not found");
  return path.join(__dirname, "dist", files[0]);
}
async function waitForFile(file, timeoutMs=30000) {
  const start=Date.now();
  while(Date.now()-start<timeoutMs) {
    if(fs.existsSync(file)) return;
    await wait(500);
  }
  fail("Timed out waiting for " + file);
}
async function main() {
  fs.rmSync(installDir,{recursive:true,force:true});
  fs.rmSync(userData,{recursive:true,force:true});

  const installer=findInstaller();
  run(installer, ["/S", "/D="+installDir]);
  const exe=path.join(installDir, "RT-RW-SID CONNECT.exe");
  await waitForFile(exe);

  const child=cp.spawn(exe, ["--remote-debugging-port=9222"], {detached:true,stdio:"ignore",windowsHide:true});
  child.unref();
  await waitForFile(dbPath,30000);

  const asar=path.join(installDir,"resources","app.asar");
  const website=path.join(installDir,"resources","app-content","website","index.html");
  if(!fs.existsSync(asar)) fail("Installed app.asar missing");
  if(!fs.existsSync(website)) fail("Installed website payload missing");

  const dbSize=fs.statSync(dbPath).size;
  if(dbSize<=0) fail("Local database file is empty");

  const result={
    ok:true,
    acceptance:{
      A1_install:"PASS",
      A2_launch:"PASS",
      A3_offline_dependency:"PASS_STATIC_ONLY",
      A4_offline_shell_payload:"PASS_STATIC_ONLY",
      A5_local_db_created:"PASS",
      A6_local_record_operation:"MANUAL_REQUIRED",
      A7_offline_queue_pending:"MANUAL_REQUIRED",
      A8_restart:"MANUAL_REQUIRED",
      A9_queue_persistence:"MANUAL_REQUIRED",
      A10_reconnect:"MANUAL_REQUIRED",
      A11_sync_replay:"MANUAL_REQUIRED",
      A12_migration_recovery:"AUTOMATED_UNIT_TESTED",
      A13_uninstall:"MANUAL_REQUIRED",
      A14_user_data_retention:"MANUAL_REQUIRED",
      A15_reinstall:"MANUAL_REQUIRED",
      A16_clean_first_run:"AUTOMATED_FRESH_PROFILE_PENDING"
    },
    installDir,
    dbPath,
    dbSize
  };
  fs.writeFileSync(path.join(process.env.GITHUB_WORKSPACE||process.cwd(),"windows-acceptance-report.json"),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
}
main().catch(e=>fail(e.stack||String(e)));
