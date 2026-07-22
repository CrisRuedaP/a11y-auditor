# A11Y Auditor

Kit de bookmarklets para auditar la accesibilidad web (WCAG 2.1 y 2.2) de
cualquier página, directamente en el navegador y en tiempo real.

Un clic ejecuta el análisis sobre la página que estés viendo, resalta los
elementos problemáticos y copia un JSON exportable al portapapeles — listo
para pegar en un LLM o compartir con el equipo. Sin build, sin cuenta, sin
enviar nada a un servidor.

## Qué revisa

| Analizador | Qué valida |
|---|---|
| **Headings** | Jerarquía h1–h6, niveles saltados, encabezados vacíos, H1 duplicados |
| **Axe-core** | Auditoría WCAG 2.1 completa con el motor de [Deque](https://github.com/dequelabs/axe-core) |
| **Imágenes** | Alt ausente/vacío/demasiado largo, SVGs sin nombre accesible |
| **Contraste** | Ratio de color (AA 4.5:1, AAA 7:1) contra el fondo real del elemento |
| **ARIA** | Roles válidos, `aria-labelledby`/`aria-describedby` apuntando a IDs reales |
| **Formularios** | Labels asociados, tipos de input válidos, campos requeridos |
| **Landmarks** | Regiones `main`/`nav`/`header`/`footer`, secciones sin encabezado |
| **Teclado** | Navegación por Tab, foco visible, `tabindex` positivo |
| **Links** | Texto genérico ("click aquí"), enlaces sin destino, `target="_blank"` sin aviso ni `rel="noopener"` |

## Uso rápido

1. Clona o descarga este repositorio.
2. Abre [`bookmarklets/page/index.html`](bookmarklets/page/index.html) en tu
   navegador.
3. Arrastra el bookmarklet que quieras a tu barra de marcadores (o usa
   "Copiar código" y sigue la
   [instalación manual](bookmarklets/page/install-guide.html#instalacion-manual)).
4. Ve a la página que quieras auditar y haz clic en el marcador.

No necesitas servidor ni build para usarlo: los archivos de `bookmarklets/page/`
son estáticos y funcionan tanto abiertos localmente (`file://`) como servidos
desde GitHub Pages o cualquier hosting estático.

## Estructura del repositorio

```
bookmarklets/
├── build.js        # genera los bookmarklets reales a partir de src/
├── package.json    # `npm run build` (sin dependencias externas)
├── src/
│   ├── core/       # Analyzer (clase base), AuditUI (panel lateral), Auditor (orquestador)
│   ├── analyzers/  # un archivo por analizador
│   ├── utils/      # exportación JSON / portapapeles
│   └── bookmarklets/
│       ├── main.js         # menú con los 9 analizadores
│       └── individual/     # 4 marcadores rápidos y ligeros
├── dist/           # bookmarklets ya empaquetados (generado — no editar a mano)
└── page/           # sitio estático: instalación, guía de uso, visor de resultados
```

Ver [`bookmarklets/src/ARCHITECTURE.md`](bookmarklets/src/ARCHITECTURE.md) para
las decisiones de diseño detrás de cada analizador.

## Desarrollo

Los analizadores viven en `src/` como clases ES independientes (una por
archivo, con `import`/`export`) porque es la forma más simple de mantenerlos
por separado. Un bookmarklet, en cambio, tiene que ser un único script
clásico. `build.js` une esas clases, quita el `import`/`export` y genera el
`javascript:...` final:

```bash
cd bookmarklets
npm run build
```

Esto regenera `bookmarklets/dist/*.bookmarklet.js` (versión legible, útil para
revisar el código o copiarlo a mano) y `bookmarklets/page/bookmarklets.data.js`
(que la página de instalación consume para armar los botones). Ejecuta el
build después de tocar cualquier archivo en `src/`.

```bash
npm test
```

Corre los 9 analizadores contra una página de prueba con casos normales y
casos borde (ver [`bookmarklets/README.md`](bookmarklets/README.md#tests)).
Es la única dependencia de npm del repo (Playwright) — solo para quien
desarrolla el kit, nunca se empaqueta en el bookmarklet final.

Para añadir un analizador nuevo:

1. Crea `src/analyzers/mi-analizador.js` heredando de `Analyzer`
   (`src/core/analyzer.js`).
2. Añádelo al array de `src/core/auditor.js`.
3. Ejecuta `npm run build`.

## Privacidad

- Todo el análisis corre localmente en tu navegador.
- La única llamada de red es la carga de axe-core desde su CDN oficial
  (solo para los bookmarklets que lo usan).
- Los resultados solo se copian al portapapeles; nada se envía a ningún
  servidor.

## Limitaciones

Un análisis automatizado detecta aproximadamente un 30% de los problemas de
accesibilidad reales. Estos bookmarklets son un punto de partida rápido, no
un sustituto de:

- Navegación real por teclado.
- Pruebas con lectores de pantalla (NVDA, VoiceOver, JAWS).
- Pruebas con personas usuarias con discapacidad.

## Licencia

[MIT](LICENSE) — úsalo libremente en proyectos personales y comerciales.
