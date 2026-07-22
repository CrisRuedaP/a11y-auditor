const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { openAuditedPage, issueLines } = require("./helpers.js");

describe("Auditoría completa sobre fixtures/audit.html", () => {
  let session;
  let results;

  before(async () => {
    session = await openAuditedPage("audit.html");
    results = await session.results();
  });

  after(async () => {
    await session.close();
  });

  it("no genera errores de JavaScript al correr", () => {
    assert.deepEqual(session.errors, []);
  });

  it("corrió los 9 analizadores", () => {
    assert.equal(results.summary.analyzersRun, 9);
  });

  describe("Headings", () => {
    it("detecta el salto de nivel h1 -> h3", () => {
      const lines = issueLines(results, "Headings");
      assert.ok(lines.some((l) => l.includes("h-skip")));
    });

    it("no cuenta un h1 oculto con display:none como un segundo H1", () => {
      const lines = issueLines(results, "Headings");
      assert.ok(
        !lines.some((l) => /varios? h1|debe haber solo 1/i.test(l)),
        `no debería reportar H1 duplicado: ${JSON.stringify(lines)}`,
      );
    });
  });

  describe("Imágenes", () => {
    it("detecta la imagen sin alt", () => {
      const lines = issueLines(results, "Imágenes");
      assert.ok(lines.some((l) => l.includes("img-no-alt")));
    });

    it("detecta la imagen sin alt dentro de <picture>", () => {
      const lines = issueLines(results, "Imágenes");
      assert.ok(lines.some((l) => l.includes("img-in-picture-no-alt")));
    });

    it("NO marca la imagen con alt real como problema", () => {
      const lines = issueLines(results, "Imágenes");
      assert.ok(!lines.some((l) => l.includes("img-good-alt")));
    });

    it("detecta el SVG sin título/descripción", () => {
      const lines = issueLines(results, "Imágenes");
      assert.ok(lines.some((l) => l.includes("svg-no-desc")));
    });

    it("NO marca el SVG que sí tiene <title>", () => {
      const lines = issueLines(results, "Imágenes");
      assert.ok(!lines.some((l) => l.includes("svg-with-title")));
    });
  });

  describe("Contraste", () => {
    it("NO marca el <div> envoltorio (el texto real está en su <span> hijo)", () => {
      const lines = issueLines(results, "Contraste");
      assert.ok(
        !lines.some((l) => l.includes("contrast-wrapper-good")),
        `no debería marcar el wrapper: ${JSON.stringify(lines)}`,
      );
    });

    it("SÍ marca el texto realmente poco legible", () => {
      const lines = issueLines(results, "Contraste");
      assert.ok(lines.some((l) => l.includes("contrast-real-bad")));
    });
  });

  describe("ARIA", () => {
    it("NO marca un botón sin nombre si está aria-hidden (no expuesto a AT)", () => {
      const lines = issueLines(results, "ARIA");
      assert.ok(
        !lines.some((l) => l.includes("aria-hidden-btn")),
        `no debería marcar un botón aria-hidden: ${JSON.stringify(lines)}`,
      );
    });

    it("SÍ marca un botón visible sin nombre accesible", () => {
      const lines = issueLines(results, "ARIA");
      assert.ok(lines.some((l) => l.includes("aria-visible-unlabeled")));
    });

    it("detecta el role inválido", () => {
      const lines = issueLines(results, "ARIA");
      assert.ok(lines.some((l) => l.includes("aria-bad-role")));
    });
  });

  describe("Formularios", () => {
    it("NO marca un input con label implícito (envolvente, sin for/id)", () => {
      const lines = issueLines(results, "Formularios");
      assert.ok(
        !lines.some((l) => l.includes("form-implicit-input")),
        `no debería marcar el input con label implícito: ${JSON.stringify(lines)}`,
      );
    });

    it("SÍ marca el input sin ningún label", () => {
      const lines = issueLines(results, "Formularios");
      assert.ok(lines.some((l) => l.includes("form-input-no-label")));
    });

    it("NO marca el input con label explícito (for/id)", () => {
      const lines = issueLines(results, "Formularios");
      assert.ok(!lines.some((l) => l.includes('"form-explicit-input"')));
    });
  });

  describe("Links", () => {
    it("detecta el texto de enlace genérico", () => {
      const lines = issueLines(results, "Links");
      assert.ok(lines.some((l) => l.includes("link-generic")));
    });

    it("NO marca un link con texto descriptivo", () => {
      const lines = issueLines(results, "Links");
      assert.ok(!lines.some((l) => l.includes("link-good")));
    });

    it("detecta el link sin href", () => {
      const lines = issueLines(results, "Links");
      assert.ok(lines.some((l) => l.includes("link-no-href")));
    });

    it("detecta target=_blank sin aviso", () => {
      const lines = issueLines(results, "Links");
      assert.ok(lines.some((l) => l.includes("link-blank-no-warning")));
    });
  });

  describe("Teclado", () => {
    it("detecta el div con onclick sin rol ni tabindex", () => {
      const lines = issueLines(results, "Teclado");
      assert.ok(lines.some((l) => l.includes("kbd-onclick-no-role")));
    });

    it("no inventa un veredicto de foco visible por elemento (no se puede comprobar de forma confiable vía script)", () => {
      const lines = issueLines(results, "Teclado");
      assert.ok(!lines.some((l) => l.includes("kbd-good-focus-style")));
      assert.ok(!lines.some((l) => l.includes("kbd-bad-focus-style")));
      assert.ok(
        lines.some((l) => l.includes("focus-visible")),
        "debería avisar una sola vez que hay que revisarlo a mano",
      );
    });
  });
});
