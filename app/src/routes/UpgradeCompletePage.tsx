// Mollie's redirectUrl target after checkout. The subscription itself is
// only actually activated by the webhook (see worker/src/routes/billing.ts)
// once Mollie confirms payment — this page doesn't poll for that, it just
// sends the user back to the app, where the Plan page will reflect Pro
// once they reopen/refresh it (usually within seconds).
export function UpgradeCompletePage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-bg px-6 py-8 text-center">
      <p className="text-3xl">✓</p>
      <h1 className="mt-2 text-xl font-bold text-ink">Thanks!</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Switch back to the NoBSLifestyle app — your Pro features will show up within a few seconds.
      </p>
    </div>
  );
}
