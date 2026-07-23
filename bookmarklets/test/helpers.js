const fs = require("fs");
const path = require("path");
const http = require("http");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const FIXTURES_DIR = path.join(__dirname, "fixtures");
const CURRENT_VERSION = require(path.join(ROOT, "package.json")).version;
const VERSION_CHECK_URL_PATTERN =
  "**/CrisRuedaP/a11y-auditor/main/bookmarklets/page/version.json";

/**
 * The bookmarklet's optional update check hits a real GitHub URL. Tests
 * must never depend on that being reachable, so every test intercepts it
 * and responds with a version of its choosing (the current one by default,
 * meaning "no update available"). Pass `remoteVersion: false` to simulate
 * the request failing outright (offline, blocked, hosting down, etc).
 */
function mockVersionCheck(page, remoteVersion = CURRENT_VERSION) {
  if (remoteVersion === false) {
    return page.route(VERSION_CHECK_URL_PATTERN, (route) => route.abort());
  }
  return page.route(VERSION_CHECK_URL_PATTERN, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ version: remoteVersion }),
    }),
  );
}

function readBookmarklet(key) {
  return fs.readFileSync(path.join(ROOT, "dist", `${key}.bookmarklet.js`), "utf8");
}

function serveFixtures() {
  const server = http.createServer((req, res) => {
    const file = path.join(FIXTURES_DIR, decodeURIComponent(req.url.split("?")[0]));
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(data);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

/**
 * Opens a fixture, injects the main bookmarklet, runs "Ejecutar Todos",
 * and leaves the page + results ready for assertions.
 */
async function openAuditedPage(fixtureFile, { remoteVersion } = {}) {
  const { server, baseUrl } = await serveFixtures();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(err));

  await mockVersionCheck(page, remoteVersion);
  await page.goto(`${baseUrl}/${fixtureFile}`);
  await page.evaluate(readBookmarklet("main"));
  await page.waitForTimeout(200);
  // Scoped to the bookmarklet's own panel: the ID-collision fixture brings
  // its own unrelated #run-all, and an unscoped selector would click that
  // one instead of the panel's real button.
  await page.click("#a11y-audit-sidebar #run-all");
  await page.waitForFunction(
    () => window.a11yAuditResults && window.a11yAuditResults.summary.analyzersRun === 9,
    { timeout: 20000 },
  );

  return {
    page,
    errors,
    results: () => page.evaluate(() => window.a11yAuditResults),
    close: async () => {
      await browser.close();
      server.close();
    },
  };
}

/** An analyzer's issue messages+selector, for searching with .some()/.every() */
function issueLines(results, analyzerName) {
  const analyzer = results.results[analyzerName];
  if (!analyzer) throw new Error(`No such analyzer: "${analyzerName}"`);
  return analyzer.issues.map((issue) => `${issue.message} :: ${issue.selector || ""}`);
}

module.exports = {
  readBookmarklet,
  serveFixtures,
  openAuditedPage,
  issueLines,
  mockVersionCheck,
  CURRENT_VERSION,
};
