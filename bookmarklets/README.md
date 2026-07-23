# A11Y Auditor — bookmarklets

Documentación técnica del kit. Para la instalación y el uso general, ver el
[README de la raíz](../README.md) o abrir
[`page/index.html`](page/index.html) directamente.

## Estructura

```
src/
├── core/
│   ├── analyzer.js   # clase base: addIssue(), markPassed(), getSummary()
│   ├── ui.js          # panel lateral (tabs, resumen, resaltado, copiar JSON)
│   └── auditor.js     # orquesta los 9 analizadores y compila el resultado
├── analyzers/          # un archivo por analizador, todos extienden Analyzer
│   ├── headings.js
│   ├── axeCore.js
│   ├── images.js
│   ├── contrast.js
│   ├── aria.js
│   ├── forms.js
│   ├── semantic.js
│   ├── keyboard.js
│   └── links.js
├── utils/json.js       # stringify, copiar al portapapeles, exportar CSV
└── bookmarklets/
    ├── main.js         # menú con los 9 analizadores + panel completo
    └── individual/      # headings, axe, images, contrast — autocontenidos

build.js                 # empaqueta src/ en bookmarklets javascript: reales
dist/                     # salida de build.js (generada, no editar a mano)
page/                     # sitio estático de instalación / guía / visor
test/                     # suite de regresión (ver más abajo)
```

## Build

`src/` está escrito como módulos ES (`import`/`export`) porque es la forma
más simple de mantener cada analizador en su propio archivo. Un bookmarklet
tiene que ser un único script clásico sin `import`/`export`, así que
`build.js` concatena las clases, quita esas líneas y envuelve el resultado en
un IIFE:

```bash
npm run build
```

Genera:

- `dist/main.bookmarklet.js`, `dist/headings.bookmarklet.js`, etc. — el
  código final, legible, listo para copiar a mano si lo prefieres.
- `page/bookmarklets.data.js` — mismo código como `javascript:` + URI
  encodeado, que `page/index.html` usa para poblar los botones de instalar.

No hay dependencias de npm; el script solo usa `fs` y `path` del propio Node.

## Tests

`npm test` corre los 9 analizadores contra `test/fixtures/audit.html` (una
página con casos normales y casos borde a propósito) y compara el resultado
contra lo esperado, usando Playwright para ejecutar el bookmarklet real en un
Chromium sin cabeza:

```bash
npm test
```

Esta es la **única** dependencia de npm del repo, y es solo para quien
desarrolla/mantiene el kit — el bookmarklet que instala una persona usuaria
final sigue siendo JS puro sin dependencias. La primera vez que corras los
tests puede que necesites descargar el navegador de Playwright:

```bash
npx playwright install chromium
```

Los casos borde en `test/fixtures/audit.html` existen porque ya atraparon
bugs reales (falsos positivos) antes de que llegaran a producción:

- Un `<div>` que envuelve un `<span>` con su propio color no es quien pinta
  el texto — evaluar el contraste del div daba resultados sin sentido.
- Un fondo con gradiente/imagen (`background-image`, sin `background-color`)
  no se puede calcular de forma confiable; el analizador ahora lo dice en
  vez de asumir negro.
- Un elemento oculto por CSS (`display:none`) no debería contar para
  chequeos de "cuántos H1/links hay" — no es perceivable por nadie ahora.
- `aria-hidden="true"` saca al elemento del árbol de accesibilidad: pedirle
  un nombre accesible ahí no tiene sentido.
- Un `<label>` que envuelve un `<input>` (label implícito, sin `for`/`id`)
  es una forma válida de asociar la etiqueta.
- El indicador de foco (`:focus-visible`) **no se puede comprobar de forma
  confiable desde un bookmarklet**: en cuanto el navegador registra el clic
  que dispara el propio bookmarklet, dejar de aplicar `:focus-visible` a
  cualquier `focus()` programático posterior es una protección real del
  navegador (evita que un script simule "esto se enfocó por teclado"). El
  analizador de Teclado avisa esto una sola vez en vez de inventar un
  veredicto por elemento.

## Formato de resultados (JSON)

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

Severidades: `error` (bloquea accesibilidad), `warning` (revisar), `info`
(sugerencia opcional).

`metadata.wcag` indica el criterio y nivel de conformancia de cada
hallazgo (`{ "criterion": "1.4.3", "level": "AA" }`), o
`{ "criterion": null, "level": "buena práctica" }` cuando el chequeo es
una convención razonable pero no algo que WCAG exija puntualmente. Las
constantes viven en un solo lugar, [`src/core/wcag.js`](src/core/wcag.js),
e importadas por cada analizador — evitá declarar una constante `wcag`
local en un analizador nuevo, porque `build.js` concatena todos los
archivos en el mismo scope y un nombre repetido rompe el bookmarklet
generado (ver "Tests" arriba: es exactamente el tipo de bug que
`npm test` existe para atrapar). Para Axe-Core, el criterio sale de las
etiquetas reales que ya trae cada regla de axe-core, no de una
suposición nuestra.

## Añadir un analizador

1. Crea `src/analyzers/mi-analizador.js`:

   ```js
   import Analyzer from "../core/analyzer.js";

   class MiAnalizador extends Analyzer {
     constructor() {
       super("Mi Analizador", "Qué revisa, en una frase");
     }

     async run() {
       this.reset();
       // this.addIssue("error", "mensaje", elemento, metadata)
       // this.markPassed()
       return this.getSummary();
     }
   }

   export default MiAnalizador;
   ```

2. Regístralo en `src/core/auditor.js` (import + añadir al array
   `this.analyzers`).
3. `npm run build`.

Un bookmarklet individual es opcional: solo hace falta si quieres poder
ejecutar ese analizador por separado, sin abrir el panel completo (ver
`src/bookmarklets/individual/` para el patrón: un IIFE autocontenido con su
propio popup, sin depender de las clases de `core/`).

## Decisiones de diseño

Ver [`src/ARCHITECTURE.md`](src/ARCHITECTURE.md).

## Licencia

MIT, ver [LICENSE](../LICENSE) en la raíz del repositorio.
