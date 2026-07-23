# A11Y Auditor — bookmarklets

Technical documentation for the kit. For installation and general usage, see the
[root README](../README.md) or open
[`page/index.html`](page/index.html) directly.

## Structure

```
src/
├── core/
│   ├── analyzer.js   # base class: addIssue(), markPassed(), getSummary()
│   ├── ui.js          # sidebar panel (tabs, summary, highlighting, copy JSON)
│   └── auditor.js     # orchestrates the 9 analyzers and compiles the result
├── analyzers/          # one file per analyzer, all extend Analyzer
│   ├── headings.js
│   ├── axeCore.js
│   ├── images.js
│   ├── contrast.js
│   ├── aria.js
│   ├── forms.js
│   ├── semantic.js
│   ├── keyboard.js
│   └── links.js
├── utils/json.js       # stringify, copy to clipboard, export CSV
└── bookmarklets/
    ├── main.js         # menu with the 9 analyzers + full panel
    └── individual/      # headings, axe, images, contrast — self-contained

build.js                 # packages src/ into real javascript: bookmarklets
dist/                     # build.js output (generated, don't edit by hand)
page/                     # static install/guide/viewer site
test/                     # regression suite (see below)
```

## Build

`src/` is written as ES modules (`import`/`export`) because that's the
simplest way to keep each analyzer in its own file. A bookmarklet has to be
a single classic script with no `import`/`export`, so `build.js`
concatenates the classes, strips those lines, and wraps the result in an
IIFE:

```bash
npm run build
```

Generates:

- `dist/main.bookmarklet.js`, `dist/headings.bookmarklet.js`, etc. — the
  final, readable code, ready to copy by hand if you prefer.
- `page/bookmarklets.data.js` — the same code as a `javascript:` + URI-
  encoded string, which `page/index.html` uses to populate the install
  buttons.

There are no npm dependencies; the script only uses Node's own `fs` and
`path`.

## Tests

`npm test` runs the 9 analyzers against `test/fixtures/audit.html` (a page
with normal cases and deliberate edge cases) and compares the result
against what's expected, using Playwright to run the real bookmarklet in a
headless Chromium:

```bash
npm test
```

This is the repo's **only** npm dependency, and it's only for whoever
develops/maintains the kit — the bookmarklet a real end user installs is
still plain dependency-free JS. The first time you run the tests you may
need to download Playwright's browser:

```bash
npx playwright install chromium
```

The edge cases in `test/fixtures/audit.html` exist because they already
caught real bugs (false positives) before they reached production:

- A `<div>` wrapping a `<span>` with its own color isn't the one painting
  the text — evaluating the div's contrast gave nonsensical results.
- A gradient/image background (`background-image`, no `background-color`)
  can't be reliably calculated; the analyzer now says so instead of
  assuming black.
- An element hidden via CSS (`display:none`) shouldn't count toward "how
  many H1s/links are there" checks — it isn't perceivable by anyone right
  now.
- `aria-hidden="true"` removes the element from the accessibility tree:
  requiring an accessible name there doesn't make sense.
- A `<label>` wrapping an `<input>` (implicit label, no `for`/`id`) is a
  valid way to associate the label.
- The focus indicator (`:focus-visible`) **can't be reliably checked from
  a bookmarklet**: as soon as the browser registers the click that
  triggers the bookmarklet itself, it stops applying `:focus-visible` to
  any subsequent programmatic `focus()` — that's a real browser protection
  (it prevents a script from faking "this was focused via keyboard"). The
  Keyboard analyzer flags this once instead of making up a per-element
  verdict.

## Results format (JSON)

```json
{
  "metadata": {
    "timestamp": "2026-07-22T10:30:00Z",
    "url": "https://ejemplo.com",
    "viewport": { "width": 1920, "height": 1080 }
  },
  "summary": {
    "totalPassed": 45,
    "totalFailed": 3,
    "totalWarnings": 8,
    "totalIssues": 11,
    "severity": "medium"
  },
  "results": {
    "Headings": {
      "passed": 3,
      "failed": 1,
      "warnings": 0,
      "issues": [
        {
          "severity": "error",
          "message": "No hay H1 en la página",
          "selector": null,
          "elementInfo": null,
          "metadata": {
            "severity": "critical",
            "wcag": { "criterion": null, "level": "buena práctica" }
          }
        }
      ]
    }
  }
}
```

Severities: `error` (blocks accessibility), `warning` (should be reviewed),
`info` (optional suggestion).

`metadata.wcag` indicates each finding's criterion and conformance level
(`{ "criterion": "1.4.3", "level": "AA" }`), or
`{ "criterion": null, "level": "buena práctica" }` when the check is a
reasonable convention but not something WCAG strictly requires. The
constants live in a single place, [`src/core/wcag.js`](src/core/wcag.js),
imported by every analyzer — avoid declaring a local `wcag` constant in a
new analyzer, since `build.js` concatenates every file into the same
scope and a repeated name breaks the generated bookmarklet (see "Tests"
above: this is exactly the kind of bug `npm test` exists to catch). For
Axe-Core, the criterion comes from the real tags each axe-core rule
already ships with, not from a guess on our part.

## Adding an analyzer

1. Create `src/analyzers/my-analyzer.js`:

   ```js
   import Analyzer from "../core/analyzer.js";

   class MyAnalyzer extends Analyzer {
     constructor() {
       super("My Analyzer", "What it checks, in one sentence");
     }

     async run() {
       this.reset();
       // this.addIssue("error", "message", element, metadata)
       // this.markPassed()
       return this.getSummary();
     }
   }

   export default MyAnalyzer;
   ```

2. Register it in `src/core/auditor.js` (import + add it to the
   `this.analyzers` array).
3. `npm run build`.

An individual bookmarklet is optional: you only need one if you want to be
able to run that analyzer on its own, without opening the full panel (see
`src/bookmarklets/individual/` for the pattern: a self-contained IIFE with
its own popup, not depending on the `core/` classes).

## Design decisions

See [`src/ARCHITECTURE.md`](src/ARCHITECTURE.md).

## License

MIT, see [LICENSE](../LICENSE) at the repo root.
