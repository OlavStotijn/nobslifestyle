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

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

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

// wrangler's `run_worker_first: ["/api/*"]` sends every /api/* request here
// and lets the assets binding serve everything else (including the SPA's
// index.html fallback) without ever invoking this Worker — so anything that
// reaches this point and isn't matched above is a genuinely unknown API route.
app.notFound((c) => c.json({ error: "Not found." }, 404));

export default app;
