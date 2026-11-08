import { mkdirSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const wrangler = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));
const port = process.env.PORT || "3000";
const stateDirectory = process.env.RAILWAY_VOLUME_MOUNT_PATH || "/data";

mkdirSync(stateDirectory, { recursive: true });
process.env.SITES_RUNTIME_ROOT ||= `${stateDirectory}/runtime`;
process.env.WRANGLER_SEND_METRICS ||= "false";
process.env.WRANGLER_WRITE_LOGS ||= "false";

const commonArguments = [
  "--config", "dist/server/wrangler.json",
  "--local",
  "--persist-to", stateDirectory,
];

const workerVariableNames = [
  "AUTH_BOOTSTRAP_TOKEN",
  "AUTH_SESSION_SECRET",
  "BOOTSTRAP_ADMIN_EMAIL",
  "DATA_BACKEND",
  "ENTRA_REDIRECT_URI",
  "MASTER_BOOTSTRAP_TOKEN",
  "MASTER_BOOTSTRAP_EMAIL",
];
const workerVariableArguments = workerVariableNames.flatMap((name) => {
  const value = process.env[name];
  return value ? ["--var", `${name}:${value}`] : [];
});

const migration = spawnSync(
  process.execPath,
  [wrangler, "d1", "migrations", "apply", "DB", ...commonArguments],
  { cwd: projectRoot, env: { ...process.env, CI: "true" }, stdio: "inherit" },
);

if (migration.error) throw migration.error;
if (migration.status !== 0) process.exit(migration.status ?? 1);

const server = spawn(
  process.execPath,
  [wrangler, "dev", ...commonArguments, ...workerVariableArguments, "--ip", "0.0.0.0", "--port", port, "--inspector-port", "0"],
  { cwd: projectRoot, env: process.env, stdio: "inherit" },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}

server.on("error", (error) => {
  throw error;
});
server.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
