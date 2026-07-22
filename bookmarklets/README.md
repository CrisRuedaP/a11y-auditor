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
          "metadata": { "severity": "critical" }
        }
      ]
    }
  }
}
```

Severidades: `error` (bloquea accesibilidad), `warning` (revisar), `info`
(sugerencia opcional).

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
