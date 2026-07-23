const fs = require("fs");
const path = require("path");
const http = require("http");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const FIXTURES_DIR = path.join(__dirname, "fixtures");

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
async function openAuditedPage(fixtureFile) {
  const { server, baseUrl } = await serveFixtures();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(err));

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

module.exports = { readBookmarklet, serveFixtures, openAuditedPage, issueLines };
