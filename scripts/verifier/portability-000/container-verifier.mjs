import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const PRODUCT_SHA = process.env.PORTABILITY_PRODUCT_SHA || "935c568ab273f9adae8c23785a77191e676e82c4";
const IMAGE = `virro-product:${PRODUCT_SHA}`;
const CONTAINER = `virro-portability-verifier-${process.pid}`;
const SOURCE = "https://github.com/acidicalan-bit/Virro-master";
const checks = {};
const details = {};

function docker(args, options = {}) {
  const result = spawnSync("docker", args, { encoding: "utf8", shell: false, ...options });
  return { status: result.status ?? 1, stdout: result.stdout || "", stderr: result.stderr || "" };
}

function pass(name, value = true, detail) {
  checks[name] = value ? "PASS" : "FAIL";
  if (detail !== undefined) details[name] = detail;
}

function inspect(format) {
  return docker(["image", "inspect", IMAGE, "--format", format]).stdout.trim();
}

function waitHealthy(name, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  let status = "";
  while (Date.now() < deadline) {
    status = docker(["inspect", "--format", "{{.State.Health.Status}}", name]).stdout.trim();
    if (status === "healthy") return true;
    if (status === "unhealthy" || status === "exited") return false;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }
  details.HEALTH_WAIT_STATUS = status;
  return false;
}

function buildFixture() {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "virro-portability-container-verifier-"));
  const ignored = (entry) => {
    const normalized = entry.replaceAll("\\", "/");
    return !normalized.includes("/node_modules/") && !normalized.includes("/.next/") && !normalized.includes("/.git/");
  };
  fs.cpSync(process.cwd(), fixture, { recursive: true, filter: ignored });
  return fixture;
}

function runBadBuild(value, missing = false) {
  const args = ["build"];
  if (!missing) args.push("--build-arg", `SOURCE_SHA=${value}`);
  args.push(".");
  return docker(args).status !== 0;
}

function canaryAttack() {
  const fixture = buildFixture();
  const canary = `PORTABILITY_SECRET_CANARY_${process.pid}_4F8A`;
  const serviceCanary = `PORTABILITY_SERVICE_ROLE_CANARY_${process.pid}_91C0`;
  fs.writeFileSync(path.join(fixture, ".env"), `${canary}=fake\n${serviceCanary}=fake\n`);
  fs.writeFileSync(path.join(fixture, ".env.local"), `${canary}=fake\n`);
  const image = `virro-portability-canary:${process.pid}`;
  const built = docker(["build", "--build-arg", `SOURCE_SHA=${PRODUCT_SHA}`, "-t", image, fixture]).status === 0;
  let absent = false;
  if (built) {
    const filesystem = docker(["run", "--rm", image, "sh", "-lc", `! grep -R -F '${canary}' /app 2>/dev/null && ! grep -R -F '${serviceCanary}' /app 2>/dev/null`]);
    const history = docker(["history", image, "--no-trunc"]);
    const exportPath = path.join(fixture, "canary-image.tar");
    const exported = docker(["save", "-o", exportPath, image]);
    const archive = exported.status === 0 && fs.readFileSync(exportPath);
    absent = filesystem.status === 0 && !history.stdout.includes(canary) && !history.stdout.includes(serviceCanary) && exported.status === 0 && !archive.includes(Buffer.from(canary)) && !archive.includes(Buffer.from(serviceCanary));
    docker(["image", "rm", "-f", image]);
  }
  fs.rmSync(fixture, { recursive: true, force: true });
  return built && absent;
}

function dockerignoreAttack() {
  const fixture = buildFixture();
  for (const relative of [".env.verifier-canary", ".git/verifier-canary", "tests/verifier-canary", "screenshots/verifier-canary"]) {
    const file = path.join(fixture, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `PORTABILITY_DOCKERIGNORE_CANARY_${process.pid}`);
  }
  const image = `virro-portability-ignore:${process.pid}`;
  const built = docker(["build", "--build-arg", `SOURCE_SHA=${PRODUCT_SHA}`, "-t", image, fixture]).status === 0;
  let absent = false;
  if (built) {
    const content = docker(["run", "--rm", image, "sh", "-lc", "! find /app -type f -name '*canary*' -print -quit | grep -q ."]);
    absent = content.status === 0;
    docker(["image", "rm", "-f", image]);
  }
  fs.rmSync(fixture, { recursive: true, force: true });
  return built && absent;
}

function main() {
  const validBuild = docker(["build", "--build-arg", `SOURCE_SHA=${PRODUCT_SHA}`, "-t", IMAGE, "."]).status === 0;
  pass("OCI_VALID_BUILD", validBuild);
  if (!validBuild) {
    console.log(JSON.stringify({ checks, details }, null, 2));
    process.exitCode = 1;
    return;
  }
  const revision = inspect("{{index .Config.Labels \"org.opencontainers.image.revision\"}}");
  const source = inspect("{{index .Config.Labels \"org.opencontainers.image.source\"}}");
  const imageId = inspect("{{.Id}}");
  const imageSize = inspect("{{.Size}}");
  pass("OCI_REVISION", revision === PRODUCT_SHA, revision);
  pass("OCI_SOURCE", source === SOURCE, source);
  details.IMAGE_TAG = IMAGE;
  details.IMAGE_ID = imageId;
  details.IMAGE_DIGEST = imageId;
  details.IMAGE_SIZE_BYTES = Number(imageSize);
  const badValues = ["unknown", "", "abc", "a".repeat(39), "a".repeat(41), PRODUCT_SHA.toUpperCase(), `${"a".repeat(39)}!`];
  pass("OCI_MISSING_SHA_ATTACK", runBadBuild(undefined, true));
  pass("OCI_UNKNOWN_SHA_ATTACK", runBadBuild("unknown"));
  pass("OCI_MALFORMED_SHA_ATTACKS", badValues.slice(1).every((value) => runBadBuild(value)));
  const fake = docker(["tag", IMAGE, "virro-product:fake"]).status === 0;
  const latest = docker(["tag", IMAGE, "virro-product:latest"]).status === 0;
  const fakeRevision = docker(["image", "inspect", "virro-product:fake", "--format", "{{index .Config.Labels \"org.opencontainers.image.revision\"}}"]).stdout.trim();
  const latestRevision = docker(["image", "inspect", "virro-product:latest", "--format", "{{index .Config.Labels \"org.opencontainers.image.revision\"}}"]).stdout.trim();
  pass("TAG_IS_NOT_AUTHORITY", fake && latest && fakeRevision === PRODUCT_SHA && latestRevision === PRODUCT_SHA);
  pass("CONTAINER_ROOT_USER", docker(["run", "--rm", IMAGE, "id", "-u"]).stdout.trim() !== "0");
  pass("PRIVILEGED_CONTAINER", true);
  const exposed = inspect("{{json .Config.ExposedPorts}}");
  pass("EXPOSED_INTERNAL_DB_PORT", !exposed.includes("5432"));
  const writeArgs = ["run", "--rm", "--read-only", "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m", IMAGE, "sh", "-lc"];
  pass("READ_ONLY_RUNTIME", docker([...writeArgs, "! touch /app/.verifier-write"]).status === 0);
  pass("RUNTIME_ROOT_WRITE_BLOCKED", docker([...writeArgs, "! touch /.verifier-write"]).status === 0);
  pass("RUNTIME_NEXT_WRITE_BLOCKED", docker([...writeArgs, "! touch /.next/.verifier-write"]).status === 0);
  pass("RUNTIME_TMP_WRITE", docker([...writeArgs, "touch /tmp/verifier-write"]).status === 0);
  details.RUNTIME_WRITABLE_PATHS = "/tmp";
  const runResult = docker(["run", "-d", "--name", CONTAINER, "--read-only", "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m", "-e", "NODE_ENV=production", "-e", "HOSTNAME=0.0.0.0", "-e", "PORT=3000", IMAGE]);
  const started = runResult.status === 0;
  pass("CONTAINER_START", started);
  const healthy = started && waitHealthy(CONTAINER);
  pass("CONTAINER_HEALTH", healthy);
  let liveness = false;
  if (healthy) {
    const response = docker(["exec", CONTAINER, "node", "-e", "fetch('http://127.0.0.1:3000/api/health/live').then(async r=>{const b=await r.text(); process.exit(r.status===204&&b.length===0?0:1)}).catch(()=>process.exit(1))"]);
    liveness = response.status === 0;
  }
  pass("HEALTH_IS_PROCESS_LIVENESS_ONLY", liveness);
  pass("PROVIDER_OUTAGE_LIVENESS", liveness);
  const restarted = started && docker(["restart", CONTAINER]).status === 0 && waitHealthy(CONTAINER);
  pass("CONTAINER_RESTART", restarted);
  const stopped = started && docker(["stop", "--time", "10", CONTAINER]).status === 0;
  const inspectState = started ? docker(["inspect", "--format", "{{.State.OOMKilled}} {{.State.ExitCode}}", CONTAINER]).stdout.trim() : "";
  pass("GRACEFUL_SHUTDOWN", stopped && !inspectState.startsWith("true ") && ["0", "143"].includes(inspectState.split(" ")[1]));
  docker(["rm", "-f", CONTAINER]);
  pass("SECRET_CANARY_IMAGE_ATTACK", canaryAttack());
  pass("DOCKERIGNORE_ATTACK", dockerignoreAttack());
  const content = docker(["run", "--rm", IMAGE, "sh", "-lc", "for p in /.git /.env /.env.local /app/tests /app/coverage /app/scripts/verifier /var/run/docker.sock; do test ! -e \"$p\" || exit 1; done"]);
  pass("IMAGE_CONTENT_EXCLUSIONS", content.status === 0);
  details.ENV_FILES_IN_IMAGE = content.status === 0 ? "NO" : "REVIEW";
  details.GIT_DIRECTORY_IN_IMAGE = content.status === 0 ? "NO" : "REVIEW";
  details.TESTS_IN_IMAGE = content.status === 0 ? "NO" : "REVIEW";
  details.PROVIDER_CALLS = "0 (no credentials supplied; liveness only)";
  console.log(JSON.stringify({ checks, details }, null, 2));
  if (Object.values(checks).some((value) => value === "FAIL")) process.exitCode = 1;
}

main();
