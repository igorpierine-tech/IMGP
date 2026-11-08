import { defineRailway, preserve, project, service, volume } from "railway/iac";

// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "RaizesERiquezas";

export default defineRailway(() => {
  const data = volume("imgp-volume", { region: "ams", sizeMB: 5000 });
  const raizesERiquezas = service("Raízes e Riquezas", {
    start: "sh -c 'umask 077; { printf \"AUTH_BOOTSTRAP_TOKEN=%s\\n\" \"$AUTH_BOOTSTRAP_TOKEN\"; printf \"AUTH_SESSION_SECRET=%s\\n\" \"$AUTH_SESSION_SECRET\"; printf \"BOOTSTRAP_ADMIN_EMAIL=%s\\n\" \"$BOOTSTRAP_ADMIN_EMAIL\"; printf \"DATA_BACKEND=%s\\n\" \"$DATA_BACKEND\"; printf \"ENTRA_REDIRECT_URI=%s\\n\" \"$ENTRA_REDIRECT_URI\"; } > .dev.vars; exec npm run start:railway'",
    healthcheck: "/Projetos/login",
    healthcheckTimeout: 300,
    build: {
      builder: "DOCKERFILE",
      dockerfilePath: "/Dockerfile",
    },
    env: {
      AUTH_BOOTSTRAP_TOKEN: preserve(),
      AUTH_SESSION_SECRET: preserve(),
      BOOTSTRAP_ADMIN_EMAIL: preserve(),
      DATA_BACKEND: preserve(),
      ENTRA_REDIRECT_URI: preserve(),
    },
    volumeMounts: {
      "/data": data,
    },
  });
  return project("Raízes e Riquezas", {
    resources: [data, raizesERiquezas],
  });
});
