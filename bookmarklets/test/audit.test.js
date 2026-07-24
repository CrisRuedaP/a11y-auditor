const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { openAuditedPage, issueLines } = require("./helpers.js");

describe("Full audit over fixtures/audit.html", () => {
  let session;
  let results;

  before(async () => {
    session = await openAuditedPage("audit.html");
    results = await session.results();
  });

  after(async () => {
    await session.close();
  });

  it("doesn't throw any JavaScript errors while running", () => {
    assert.deepEqual(session.errors, []);
  });

  it("ran all 9 analyzers", () => {
    assert.equal(results.summary.analyzersRun, 9);
  });

  it("doesn't show the update notice when already on the latest version", async () => {
    const hidden = await session.page.evaluate(
      () => document.querySelector("#a11y-update-notice")?.hidden,
    );
    assert.equal(hidden, true);
  });

  it("shifts the page content (margin-right on <html>) instead of covering it, and undoes it on close", async () => {
    const marginWhileOpen = await session.page.evaluate(
      () => document.documentElement.style.marginRight,
    );
    assert.ok(
      marginWhileOpen && parseFloat(marginWhileOpen) > 0,
      `should have a positive margin-right while the panel is open, was: "${marginWhileOpen}"`,
    );

    await session.page.click("#a11y-audit-sidebar .a11y-audit-close");
    await session.page.waitForFunction(
      () => document.documentElement.style.marginRight === "",
    );
  });

  describe("Headings", () => {
    it("detects the h1 -> h3 level jump", () => {
      const lines = issueLines(results, "Headings");
      assert.ok(lines.some((l) => l.includes("h-skip")));
    });

    it("doesn't count a display:none-hidden h1 as a second H1", () => {
      const lines = issueLines(results, "Headings");
      assert.ok(
        !lines.some((l) => /varios? h1|debe haber solo 1/i.test(l)),
        `shouldn't report a duplicate H1: ${JSON.stringify(lines)}`,
      );
    });
  });

  describe("Imágenes", () => {
    it("detects the image without alt", () => {
      const lines = issueLines(results, "Imágenes");
      assert.ok(lines.some((l) => l.includes("img-no-alt")));
    });

    it("detects the image without alt inside a <picture>", () => {
      const lines = issueLines(results, "Imágenes");
      assert.ok(lines.some((l) => l.includes("img-in-picture-no-alt")));
    });

    it("does NOT flag the image with a real alt as a problem", () => {
      const lines = issueLines(results, "Imágenes");
      assert.ok(!lines.some((l) => l.includes("img-good-alt")));
    });

    it('flags alt="" with no role as "empty alt", NOT as "missing alt" (alt="" is falsy in JS, easy to conflate with a missing attribute)', () => {
      const analyzer = results.results["Imágenes"];
      const issue = analyzer.issues.find((i) =>
        i.selector?.includes("img-empty-alt-no-role"),
      );
      assert.ok(issue, "should report the empty-alt image");
      assert.ok(
        issue.message.includes("alt vacío"),
        `expected the "empty alt" message, got: "${issue.message}"`,
      );
      assert.ok(
        !issue.message.includes("sin atributo alt"),
        `alt="" must not be reported as a missing alt attribute: "${issue.message}"`,
      );
    });

    it("generates a valid selector for ids with special characters (React useId, etc)", async () => {
      const analyzer = results.results["Imágenes"];
      const issue = analyzer.issues.find((i) => i.message.includes("sin atributo alt") && i.selector?.includes("r-weird-id"));
      assert.ok(issue, "should report the image with the odd id");
      const foundInPage = await session.page.evaluate(
        (selector) => !!document.querySelector(selector),
        issue.selector,
      );
      assert.ok(foundInPage, `the selector "${issue.selector}" should find the real element`);
    });

    it("detects the SVG without a title/description", () => {
      const lines = issueLines(results, "Imágenes");
      assert.ok(lines.some((l) => l.includes("svg-no-desc")));
    });

    it("does NOT flag the SVG that does have a <title>", () => {
      const lines = issueLines(results, "Imágenes");
      assert.ok(!lines.some((l) => l.includes("svg-with-title")));
    });

    it("does NOT flag a decorative icon with aria-hidden (correctly hidden, doesn't need a description)", () => {
      const lines = issueLines(results, "Imágenes");
      assert.ok(
        !lines.some((l) => l.endsWith("#svg-decorative-hidden")),
        `an aria-hidden SVG shouldn't need a description: ${JSON.stringify(lines)}`,
      );
    });

    it('does NOT flag an SVG hidden via an ancestor\'s aria-hidden="true" (a common wrapper pattern, e.g. an icon-tile div) — aria-hidden cascades to descendants', () => {
      const lines = issueLines(results, "Imágenes");
      assert.ok(
        !lines.some((l) => l.includes("svg-decorative-hidden-by-ancestor")),
        `an SVG hidden by an ancestor's aria-hidden shouldn't need its own: ${JSON.stringify(lines)}`,
      );
    });
  });

  describe("Contraste", () => {
    it("does NOT flag the wrapper <div> (the real text is in its child <span>)", () => {
      const lines = issueLines(results, "Contraste");
      assert.ok(
        !lines.some((l) => l.includes("contrast-wrapper-good")),
        `shouldn't flag the wrapper: ${JSON.stringify(lines)}`,
      );
    });

    it("DOES flag the genuinely hard-to-read text", () => {
      const lines = issueLines(results, "Contraste");
      assert.ok(lines.some((l) => l.includes("contrast-real-bad")));
    });

    it("tags the finding with the real WCAG criterion (1.4.3, level AA)", () => {
      const issue = results.results["Contraste"].issues.find((i) =>
        i.selector?.includes("contrast-real-bad"),
      );
      assert.deepEqual(issue.metadata.wcag, { criterion: "1.4.3", level: "AA" });
    });
  });

  describe("ARIA", () => {
    it("does NOT flag a nameless button if it's aria-hidden (not exposed to AT)", () => {
      const lines = issueLines(results, "ARIA");
      assert.ok(
        !lines.some((l) => l.includes("aria-hidden-btn")),
        `shouldn't flag an aria-hidden button: ${JSON.stringify(lines)}`,
      );
    });

    it("DOES flag a visible button with no accessible name", () => {
      const lines = issueLines(results, "ARIA");
      assert.ok(lines.some((l) => l.includes("aria-visible-unlabeled")));
    });

    it("detects the invalid role", () => {
      const lines = issueLines(results, "ARIA");
      assert.ok(lines.some((l) => l.includes("aria-bad-role")));
    });
  });

  describe("Formularios", () => {
    it("does NOT flag an input with an implicit label (wrapping, no for/id)", () => {
      const lines = issueLines(results, "Formularios");
      assert.ok(
        !lines.some((l) => l.includes("form-implicit-input")),
        `shouldn't flag the input with an implicit label: ${JSON.stringify(lines)}`,
      );
    });

    it("DOES flag the input with no label at all", () => {
      const lines = issueLines(results, "Formularios");
      assert.ok(lines.some((l) => l.includes("form-input-no-label")));
    });

    it("does NOT flag the input with an explicit label (for/id)", () => {
      const lines = issueLines(results, "Formularios");
      assert.ok(!lines.some((l) => l.includes('"form-explicit-input"')));
    });

    it('does NOT flag the implicit <label> as "missing the for attribute"', () => {
      const lines = issueLines(results, "Formularios");
      assert.ok(
        !lines.some((l) => l.includes("form-implicit-label")),
        `a label wrapping its input doesn't need "for": ${JSON.stringify(lines)}`,
      );
    });
  });

  describe("Links", () => {
    it("detects generic link text", () => {
      const lines = issueLines(results, "Links");
      assert.ok(lines.some((l) => l.includes("link-generic")));
    });

    it("does NOT flag a link with descriptive text", () => {
      const lines = issueLines(results, "Links");
      assert.ok(!lines.some((l) => l.includes("link-good")));
    });

    it("detects the link with no href", () => {
      const lines = issueLines(results, "Links");
      assert.ok(lines.some((l) => l.includes("link-no-href")));
    });

    it("detects target=_blank with no warning", () => {
      const lines = issueLines(results, "Links");
      assert.ok(lines.some((l) => l.includes("link-blank-no-warning")));
    });

    it('flags "missing rel=noopener" as a best practice, not a made-up WCAG criterion', () => {
      const issue = results.results["Links"].issues.find((i) =>
        i.message.includes("rel"),
      );
      assert.deepEqual(issue.metadata.wcag, {
        criterion: null,
        level: "buena práctica",
      });
    });
  });

  describe("Teclado", () => {
    it("detects the div with onclick and no role or tabindex", () => {
      const lines = issueLines(results, "Teclado");
      assert.ok(lines.some((l) => l.includes("kbd-onclick-no-role")));
    });

    it("reports nothing about the visible focus indicator (can't be reliably checked via script, and reporting a 'don't know' wouldn't make sense)", () => {
      const lines = issueLines(results, "Teclado");
      assert.ok(!lines.some((l) => l.includes("kbd-good-focus-style")));
      assert.ok(!lines.some((l) => l.includes("kbd-bad-focus-style")));
      assert.ok(!lines.some((l) => l.includes("focus-visible")));
    });
  });
});

describe("ID collisions with the audited site", () => {
  let session;

  after(async () => {
    await session?.close();
  });

  it('the "Ejecutar Todos" click works even if the site already has its own #run-all/.analyzer-btn', async () => {
    session = await openAuditedPage("id-collision.html");
    const results = await session.results();
    assert.equal(results.summary.analyzersRun, 9);
  });
});

describe("Optional version check", () => {
  it("shows the update notice with the remote version when a newer one is available", async () => {
    const session = await openAuditedPage("audit.html", { remoteVersion: "999.0.0" });
    try {
      await session.page.waitForFunction(
        () => document.querySelector("#a11y-update-notice")?.hidden === false,
        { timeout: 5000 },
      );
      const message = await session.page.evaluate(
        () => document.querySelector("#a11y-update-notice [data-update-message]").textContent,
      );
      assert.ok(
        message.includes("999.0.0"),
        `notice should mention the new version: "${message}"`,
      );

      await session.page.click("#a11y-update-notice .a11y-audit-update-dismiss");
      const hidden = await session.page.evaluate(
        () => document.querySelector("#a11y-update-notice").hidden,
      );
      assert.equal(hidden, true, "dismiss button should hide the notice");
    } finally {
      await session.close();
    }
  });

  it("doesn't show the notice for an older or equal remote version", async () => {
    const session = await openAuditedPage("audit.html", { remoteVersion: "0.0.1" });
    try {
      const hidden = await session.page.evaluate(
        () => document.querySelector("#a11y-update-notice")?.hidden,
      );
      assert.equal(hidden, true);
    } finally {
      await session.close();
    }
  });

  it("fails silently and never breaks the audit if the version check request fails", async () => {
    const session = await openAuditedPage("audit.html", { remoteVersion: false });
    try {
      assert.deepEqual(session.errors, []);
      const results = await session.results();
      assert.equal(results.summary.analyzersRun, 9);
      const hidden = await session.page.evaluate(
        () => document.querySelector("#a11y-update-notice")?.hidden,
      );
      assert.equal(hidden, true);
    } finally {
      await session.close();
    }
  });
});
