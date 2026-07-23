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

    it("genera un selector válido para ids con caracteres especiales (React useId, etc)", async () => {
      const analyzer = results.results["Imágenes"];
      const issue = analyzer.issues.find((i) => i.message.includes("sin atributo alt") && i.selector?.includes("r-weird-id"));
      assert.ok(issue, "debería reportar la imagen con id raro");
      const foundInPage = await session.page.evaluate(
        (selector) => !!document.querySelector(selector),
        issue.selector,
      );
      assert.ok(foundInPage, `el selector "${issue.selector}" debería encontrar el elemento real`);
    });

    it("detecta el SVG sin título/descripción", () => {
      const lines = issueLines(results, "Imágenes");
      assert.ok(lines.some((l) => l.includes("svg-no-desc")));
    });

    it("NO marca el SVG que sí tiene <title>", () => {
      const lines = issueLines(results, "Imágenes");
      assert.ok(!lines.some((l) => l.includes("svg-with-title")));
    });

    it("NO marca un ícono decorativo con aria-hidden (está bien oculto, no le hace falta descripción)", () => {
      const lines = issueLines(results, "Imágenes");
      assert.ok(
        !lines.some((l) => l.includes("svg-decorative-hidden")),
        `un SVG aria-hidden no debería necesitar descripción: ${JSON.stringify(lines)}`,
      );
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

    it("etiqueta el hallazgo con el criterio WCAG real (1.4.3, nivel AA)", () => {
      const issue = results.results["Contraste"].issues.find((i) =>
        i.selector?.includes("contrast-real-bad"),
      );
      assert.deepEqual(issue.metadata.wcag, { criterion: "1.4.3", level: "AA" });
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

    it('NO marca el <label> implícito como "sin atributo for"', () => {
      const lines = issueLines(results, "Formularios");
      assert.ok(
        !lines.some((l) => l.includes("form-implicit-label")),
        `un label que envuelve su input no necesita "for": ${JSON.stringify(lines)}`,
      );
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

    it('marca "sin rel=noopener" como buena práctica, no como un criterio WCAG inventado', () => {
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
    it("detecta el div con onclick sin rol ni tabindex", () => {
      const lines = issueLines(results, "Teclado");
      assert.ok(lines.some((l) => l.includes("kbd-onclick-no-role")));
    });

    it("no reporta nada sobre foco visible (no se puede comprobar de forma confiable vía script, y no tiene sentido reportar un 'no sé')", () => {
      const lines = issueLines(results, "Teclado");
      assert.ok(!lines.some((l) => l.includes("kbd-good-focus-style")));
      assert.ok(!lines.some((l) => l.includes("kbd-bad-focus-style")));
      assert.ok(!lines.some((l) => l.includes("focus-visible")));
    });
  });
});

describe("Colisión de IDs con el sitio auditado", () => {
  let session;

  after(async () => {
    await session?.close();
  });

  it('el clic en "Ejecutar Todos" funciona aunque el sitio ya tenga su propio #run-all/.analyzer-btn', async () => {
    session = await openAuditedPage("id-collision.html");
    const results = await session.results();
    assert.equal(results.summary.analyzersRun, 9);
  });
});
