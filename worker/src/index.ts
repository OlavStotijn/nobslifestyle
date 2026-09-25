import { Hono } from "hono";
import type { Env } from "./types";
import type { AuthVariables } from "./middleware/requireAuth";
import { authRoute } from "./routes/auth";
import { profileRoute } from "./routes/profile";
import { foodRoute } from "./routes/food";
import { mediaRoute } from "./routes/media";
import { workoutsRoute } from "./routes/workouts";
import { sessionsRoute } from "./routes/sessions";
import { friendsRoute } from "./routes/friends";
import { socialRoute } from "./routes/social";
import { progressPhotosRoute } from "./routes/progressPhotos";
import { cardioRoute } from "./routes/cardio";
import { notificationsRoute } from "./routes/notifications";
import { weightLogsRoute } from "./routes/weightLogs";
import { programsRoute } from "./routes/programs";
import { exportRoute } from "./routes/export";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Every request now passes through the Worker first (wrangler.jsonc sets
// `run_worker_first: true`, not just ["/api/*"]) specifically so this can
// run before any page load: the session cookie is marked Secure in
// production, and browsers silently refuse to set a Secure cookie on a
// response delivered over plain HTTP — which is exactly what caused a
// signed-up user's next request to come back "Not authenticated." Cloudflare
// normally redirects http->https at the edge (zone setting), but this
// wrangler token doesn't have zone-settings scope to turn that on, so it's
// enforced here instead as a guaranteed fallback.
app.use("*", async (c, next) => {
  const url = new URL(c.req.url);
  if (url.protocol === "http:" && c.env.ENVIRONMENT === "production") {
    url.protocol = "https:";
    return c.redirect(url.toString(), 301);
  }
  await next();
});

app.get("/api/__health", (c) => c.text("ok"));

app.route("/", authRoute);
app.route("/", profileRoute);
app.route("/", foodRoute);
app.route("/", mediaRoute);
app.route("/", workoutsRoute);
app.route("/", sessionsRoute);
app.route("/", friendsRoute);
app.route("/", socialRoute);
app.route("/", progressPhotosRoute);
app.route("/", cardioRoute);
app.route("/", notificationsRoute);
app.route("/", weightLogsRoute);
app.route("/", programsRoute);
app.route("/", exportRoute);

// Any /api/* path that didn't match a route above is a genuinely unknown
// API endpoint — respond JSON, don't fall through to the SPA shell below.
app.all("/api/*", (c) => c.json({ error: "Not found." }, 404));

// Everything else (the SPA shell, JS/CSS bundles, icons, the service
// worker) is served from the static assets binding.
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
