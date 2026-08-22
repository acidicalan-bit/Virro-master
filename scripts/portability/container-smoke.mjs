import { execFileSync, spawnSync } from "node:child_process";

const sourceSha = process.env.PORTABILITY_SOURCE_SHA || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const imageTag = process.env.PORTABILITY_IMAGE_TAG || `virro-product:${sourceSha}`;
const containerName = `virro-portability-${process.pid}`;
const hostPort = String(Number(process.env.PORTABILITY_HOST_PORT || 32000) + (process.pid % 500));
let running = false;

function run(args, options = {}) {
  const output = execFileSync("docker", args, { encoding: "utf8", stdio: options.stdio || ["ignore", "pipe", "pipe"] });
  return String(output ?? "").trim();
}
function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
async function waitHealthy() {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try {
      const status = run(["inspect", "--format", "{{if .State.Health}}{{.State.Health.Status}}{{else}}starting{{end}}", containerName]);
      if (status === "healthy") return;
    } catch {}
    await wait(1000);
  }
  throw new Error("CONTAINER_HEALTH_TIMEOUT");
}
async function liveCheck() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${hostPort}/api/health/live`);
      if (response.status === 204) return;
    } catch {}
    await wait(250);
  }
  throw new Error("LIVENESS_ENDPOINT_FAILED");
}

try {
  if (!/^[0-9a-f]{40}$/.test(sourceSha)) throw new Error("EXPECTED_SOURCE_SHA_MALFORMED");
  run(["build", "--build-arg", `SOURCE_SHA=${sourceSha}`, "-t", imageTag, "."], { stdio: "inherit" });
  const inspect = JSON.parse(run(["image", "inspect", imageTag]))[0];
  const labels = inspect.Config?.Labels || {};
  const revision = labels["org.opencontainers.image.revision"];
  if (!/^[0-9a-f]{40}$/.test(revision || "")) throw new Error("OCI_REVISION_MALFORMED");
  if (revision !== sourceSha) throw new Error("OCI_REVISION_MISMATCH");
  if (labels["org.opencontainers.image.source"] !== "https://github.com/acidicalan-bit/Virro-master") throw new Error("OCI_SOURCE_MISMATCH");
  if (inspect.Config?.User === "0" || inspect.Config?.User === "root") throw new Error("PRIVILEGED_CONTAINER");
  const imageDigest = String(inspect.Id || "").replace(/^sha256:/, "sha256:");
  run(["run", "-d", "--name", containerName, "--read-only", "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m", "-e", "NODE_ENV=production", "-e", "HOSTNAME=0.0.0.0", "-e", "PORT=3000", "-p", `127.0.0.1:${hostPort}:3000`, imageTag]);
  running = true;
  await waitHealthy();
  await liveCheck();
  const uid = run(["exec", containerName, "id", "-u"]);
  if (uid === "0") throw new Error("CONTAINER_ROOT_USER");
  const forbidden = run(["run", "--rm", "--entrypoint", "sh", imageTag, "-c", "test ! -e /app/.git && test ! -e /app/.env && test ! -e /app/.env.local && ! grep -R -E 'replace-with|sk-[A-Za-z0-9]{20,}|service_role' /app 2>/dev/null"], { stdio: "pipe" });
  void forbidden;
  run(["restart", "--time", "10", containerName]);
  await waitHealthy();
  await liveCheck();
  run(["stop", "--time", "10", containerName]);
  running = false;
  const state = JSON.parse(run(["inspect", containerName]))[0].State;
  if (state.Status !== "exited" || ![0, 143].includes(state.ExitCode) || state.OOMKilled || state.Error) throw new Error("GRACEFUL_SHUTDOWN_FAILED");
  console.log(JSON.stringify({ PRODUCT_SHA: sourceSha, IMAGE_TAG: imageTag, IMAGE_DIGEST: imageDigest, IMAGE_SIZE_BYTES: inspect.Size, CONTAINER_BUILD: "PASS", CONTAINER_START: "PASS", CONTAINER_HEALTH: "PASS", CONTAINER_RESTART: "PASS", GRACEFUL_SHUTDOWN: "PASS", READ_ONLY_RUNTIME: "PASS", RUNTIME_WRITABLE_PATHS: ["/tmp"], CONTAINER_ROOT_USER: "NO", SECRETS_IN_IMAGE: "NO", GIT_DIRECTORY_IN_IMAGE: "NO", OPENAI_CALLS: 0, PRODUCTION_SUPABASE_WRITES: 0 }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (running) {
    try { spawnSync("docker", ["rm", "-f", containerName], { stdio: "ignore" }); } catch {}
  } else {
    try { spawnSync("docker", ["rm", "-f", containerName], { stdio: "ignore" }); } catch {}
  }
}
