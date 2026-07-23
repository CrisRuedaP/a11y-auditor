# Architectural Decisions - Accessibility Bookmarklets

## Overview

Modular bookmarklet system for accessibility auditing with an interactive visual panel and JSON export for use with LLMs.

## Main Decisions

### 1. Independent Module Architecture

**Decision:** Each analyzer is an independent class that extends `Analyzer`

**Reason:**

- Allows parallel development
- Makes it easy to add new analyzers
- Each one can run independently
- Reusable code

**Implementation:**

```
Analyzer (base)
├── HeadingsAnalyzer
├── AxeCoreAnalyzer
├── ImagesAnalyzer
├── ContrastAnalyzer
├── AriaAnalyzer
├── FormsAnalyzer
├── SemanticAnalyzer
├── KeyboardAnalyzer
└── LinksAnalyzer
```

### 2. Non-Invasive Side Panel

**Decision:** UI as a fixed sidebar panel using `position: fixed`, not a floating popup

**Reason:**

- Doesn't interfere with page navigation
- Easy to close
- Lets you see the page and the results at the same time
- Responsive on mobile (becomes a bottom sheet)

### 3. Two Ways to Access It

**Decision:** 1 main bookmarklet + 4 individual ones

**Reason:**

- Main bookmarklet: full audit, panel with a menu
- Individual bookmarklets: quick audit, lightweight popup
- Flexibility depending on what the user needs
- Quick users vs. thorough users

### 4. Automatic JSON Export

**Decision:** Console.log + automatic clipboard copy

**Reason:**

- Requires no server
- LLMs can access it directly
- Clipboard enables a smooth workflow
- Console enables debugging

**Not implemented:**

- API/Webhooks (unnecessary complexity)
- File download (less accessible)

### 5. Full-Page Analysis

**Decision:** Audit the entire DOM, not just the viewport or a selected element

**Reason:**

- Gives a complete view of the issues
- More useful for initial audits
- User can scroll to see the highlights

**Future consideration:** Element selector for focused analysis

### 6. Inlined Styles

**Decision:** CSS injected directly into the `<style>` tag

**Reason:**

- Requires no external file
- Works in any context (CORS, file://, etc)
- More self-contained bookmarklet

### 7. No External Libraries (Except Axe-Core)

**Decision:** Vanilla JavaScript code, axe-core loaded dynamically

**Reason:**

- Smaller minified bookmarklets
- No webpack/bundler required
- Axe-core is an industry standard (valid exception)

### 8. Three Severity Levels

**Decision:** error, warning, info

**Reason:**

- Clear prioritization for the user
- Consistent visual colors
- Makes exporting to CSV/external systems easier

### 9. Metadata on Every Issue

**Decision:** Store CSS selector, tag, id, classes, text, custom metadata

**Reason:**

- User can find the element afterward
- LLM has context for recommendations
- Easier debugging

### 10. Separate Modular UI

**Decision:** `AuditUI` class independent from `Auditor`

**Reason:**

- Auditor can be used without a UI (testing, CLI)
- UI can be swapped for another version
- Separation of concerns
- Testable

## Specific Analyzers

### Headings

**Logic:**

1. Find h1-h6
2. Validate a single H1
3. Detect jumps (h1 → h3)
4. Detect empty ones

**Decision:** Don't validate alphabetical order of titles

### Axe-Core

**Logic:**

1. Load the library from a CDN
2. Run `axe.run()`
3. Process violations/passes

**Decision:** Load dynamically to avoid increasing the bookmarklet's size

### Imágenes

**Logic:**

1. Find IMG, SVG, background-images
2. Validate alt/title/desc
3. Detect empty alt

**Decision:** Don't do image OCR (out of scope)

### Contraste

**Logic:**

1. Calculate WCAG luminance
2. Get foreground/background colors
3. Look up through ancestors if the background is transparent
4. Calculate ratio (Lighter + 0.05) / (Darker + 0.05)

**Decision:** Use the standard WCAG 2.0 formula, not proprietary algorithms

### ARIA

**Logic:**

1. Validate roles against the ARIA 1.2 list
2. Validate that aria-labelledby/describedby point to real IDs

**Decision:** Don't validate complex ARIA properties (too much context needed)

### Formularios

**Logic:**

1. Find input, select, textarea
2. Validate label via `for`
3. Validate input type
4. Validate required/aria-required

**Decision:** Don't validate custom validation logic

### Semántica

**Logic:**

1. Detect the presence of main, header, footer
2. Validate that section/article have h1-h6
3. Count divs vs. semantic tags

**Decision:** Don't enforce a specific structure (it can vary)

### Teclado

**Logic:**

1. Detect interactive elements
2. Validate positive/negative tabindex
3. Detect divs with onclick and no role
4. Check visible focus

**Decision:** Don't automate testing Tab order (would require simulation)

### Links

**Logic:**

1. Detect generic link text ("click aquí", "leer más", etc)
2. Detect links with no real `href` (missing, empty, `#`, `javascript:void(0)`)
3. Detect `target="_blank"` with no warning in the text/aria-label and no `rel="noopener"`

**Decision:** Don't check whether the destination actually responds (would require a network call); only markup is validated

## Standards Used

### WCAG 2.2

- Level AA: Contrast 4.5:1 normal, 3:1 large
- Level AAA: Contrast 7:1 normal, 4.5:1 large

### Contrast Formula

```
RsRGB = R/255
If RsRGB <= 0.03928 then RsRGB = RsRGB/12.92
Otherwise, RsRGB = ((RsRGB+0.055)/1.055) ^ 2.4

Luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B

Contrast = (L1 + 0.05) / (L2 + 0.05)
Where L1 is the lighter luminance, L2 the darker one
```

### ARIA 1.2 Valid Roles

List of 51 roles validated against the ARIA specification

## Website

### index.html

- Hero with an "annotated page" mockup that reproduces the same visual
  language as the real panel (tag + highlight over the problematic element)
- Install grid wired to `bookmarklets.data.js` (generated by `build.js`),
  not to sample code
- Grid of the 9 analyzers with one real example finding per analyzer

### results-viewer.html

- Loads JSON from the clipboard/file/textarea
- Displays metadata and a summary
- Grid of analyzers with issues by severity

### install-guide.html

- Installation (drag + manual)
- Guide per analyzer
- FAQ as real buttons with `aria-expanded` (not divs with onclick)

## Performance

### Optimizations

- Lazy load of axe-core (only when requested)
- Analysis doesn't block the UI (potential: Web Workers)
- Cached CSS selector
- Styles compiled into CSS (no SASS)

### Size

- Main bookmarklet: ~35KB encoded as a `javascript:` URI
- Individual bookmarklets: ~5-8KB each
- The code isn't minified (comments included): since it's already encoded
  with `encodeURIComponent` it's already a single valid line for a
  bookmark, and the extra size is irrelevant for local use

## Future Considerations

### High Priority

- [ ] Web Workers support (non-blocking analysis)
- [ ] Audit history (localStorage)
- [ ] Filter results by type/severity

### Medium Priority

- [ ] Integration with tools (Jira, GitHub)
- [ ] Audit comparison (before/after)
- [ ] Export to PDF/HTML
- [ ] Dark mode in the panel

### Low Priority

- [ ] Manual element selector
- [ ] Performance profiler
- [ ] Image analysis (OCR)
- [ ] CI/CD integration

## Testing

### Manual Tests Needed

1. Page with known issues of each type
2. Large page (>10MB DOM)
3. Page with frames/iframes
4. Page with shadow DOM
5. HTTPS/secure page

### Not Automated

- Real reading with screen readers
- Live keyboard navigation
- Real user experience

## Notes for Developers

### Adding an Analyzer

1. Create `src/analyzers/myanalyzer.js`
2. Extend `Analyzer`
3. Implement `async run()`
4. Call `addIssue()` for problems
5. Call `markPassed()` for successes
6. Add it to `auditor.js`
7. Optionally create an individual bookmarklet

### Debugging

```javascript
// In the browser console:
window.a11yAuditResults; // Latest results
window.a11yAuditorInstance; // Reference to the auditor
```

### Modifying the UI

The styles live in `core/ui.js`'s `_injectStyles()` method. Base CSS class `.a11y-audit-*`.

## Rejected Decisions

### Chrome Extension

**Why not:** Requires installation, permissions, less portable

### Standalone CLI Tool

**Why not:** Strays from the point of bookmarklets, requires Node.js

### Remote Database

**Why not:** Privacy, GDPR, unnecessary complexity

### React/Vue

**Why not:** Bundle size, overkill for a simple UI

### Shadow DOM for the UI

**Why not:** Conflicts with page styles, complexity

---

**Last updated:** 2026-07-22
