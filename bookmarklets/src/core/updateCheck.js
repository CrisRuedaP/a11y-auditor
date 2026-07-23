/**
 * Optional, non-blocking check for a newer bookmarklet version. Fetches a
 * small static JSON file hosted alongside the project and compares it
 * against the version baked into this bundle at build time. Never sends
 * anything about the audited page or the audit results — just a plain GET
 * for a static file. Fails silently on any error (offline, blocked,
 * hosting down, unreachable, etc): it must never interrupt the audit
 * itself.
 */
const VERSION_CHECK_URL =
  "https://raw.githubusercontent.com/CrisRuedaP/a11y-auditor/main/bookmarklets/page/version.json";
const VERSION_CHECK_TIMEOUT_MS = 4000;

function isNewerVersion(remote, current) {
  const r = String(remote).split(".").map(Number);
  const c = String(current).split(".").map(Number);

  for (let i = 0; i < Math.max(r.length, c.length); i++) {
    const rv = r[i] || 0;
    const cv = c[i] || 0;
    if (rv > cv) return true;
    if (rv < cv) return false;
  }

  return false;
}

async function checkForUpdates(ui) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VERSION_CHECK_TIMEOUT_MS);

    const response = await fetch(VERSION_CHECK_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return;

    const data = await response.json();
    if (data?.version && isNewerVersion(data.version, A11Y_AUDITOR_VERSION)) {
      ui?.showUpdateNotice(data.version);
    }
  } catch {
    // Silent on purpose: no network, blocked by CSP, hosting down, aborted
    // by the timeout, malformed JSON, etc.
  }
}
