# A11Y Auditor

A11Y Auditor es un conjunto de **bookmarklets** para realizar auditorías rápidas de accesibilidad directamente sobre cualquier sitio web.

Analiza criterios de **WCAG 2.1 y 2.2**, resalta los elementos afectados en la página y genera un informe en formato **JSON** listo para compartir con el equipo o utilizar como contexto para asistentes de IA.

Todo el análisis se ejecuta **localmente en el navegador**, sin instalar extensiones ni enviar información a servidores externos.

---

## Características

- Auditoría de accesibilidad directamente desde el navegador.
- Resaltado visual de los elementos con incidencias.
- Exportación de resultados en formato JSON.
- Compatible con flujos de trabajo asistidos por IA.
- Todo el análisis ocurre localmente.
- Disponible como auditoría completa o mediante bookmarklets individuales.
- Basado en criterios de **WCAG 2.1**, **WCAG 2.2** y buenas prácticas de accesibilidad.

---

## Analizadores incluidos

| Analizador      | Qué valida                                                            |
| --------------- | ---------------------------------------------------------------------- |
| **Headings**    | Jerarquía h1–h6, niveles saltados, encabezados vacíos y H1 duplicados |
| **Axe-core**    | Auditoría WCAG mediante el motor de Deque                               |
| **Imágenes**    | Texto alternativo, SVG accesibles y uso correcto de `alt`               |
| **Contraste**   | Ratio de contraste respecto al fondo real del elemento                  |
| **ARIA**        | Roles, atributos y referencias ARIA                                     |
| **Formularios** | Labels, tipos de entrada y campos requeridos                            |
| **Landmarks**   | Regiones semánticas y estructura del documento                          |
| **Teclado**     | Navegación mediante Tab y orden de foco                                 |
| **Links**       | Texto descriptivo, enlaces sin destino real y apertura segura de nuevas pestañas |

---

## Uso

1. Clona o descarga este repositorio.
2. Abre `bookmarklets/page/index.html` en tu navegador.
3. Arrastra el bookmarklet que quieras a la barra de marcadores.
4. Abre la página que desees auditar.
5. Ejecuta el bookmarklet.

No necesitas instalar nada ni ejecutar un servidor: la página de instalación funciona tanto desde `file://` como desde cualquier hosting estático (por ejemplo, GitHub Pages).

---

## Desarrollo

```bash
cd bookmarklets
npm install
npm run build
npm test
```

El proyecto utiliza **Playwright** para ejecutar pruebas automatizadas sobre una página de prueba y verificar el comportamiento de los analizadores en un navegador Chromium sin interfaz gráfica. Esto ayuda a detectar regresiones y validar casos límite antes de publicar cambios.

La documentación técnica sobre la arquitectura del proyecto, el proceso de build y el funcionamiento interno de los analizadores se encuentra en:

- [`bookmarklets/README.md`](bookmarklets/README.md)
- [`bookmarklets/src/ARCHITECTURE.md`](bookmarklets/src/ARCHITECTURE.md)

---

## Privacidad

- Todo el análisis se ejecuta localmente en el navegador.
- Las únicas peticiones de red son la carga de **axe-core** desde su CDN oficial (solo en los bookmarklets que lo utilizan) y la comprobación opcional de versión descrita abajo.
- Ningún resultado se envía a servidores externos.
- Opcionalmente, los bookmarklets pueden comprobar si existe una versión más reciente consultando un pequeño archivo de metadatos alojado junto al proyecto. Esta comprobación no envía información sobre la página analizada ni sobre los resultados de la auditoría.

---

## Alcance y limitaciones

Las herramientas automáticas ayudan a detectar una parte importante de los problemas de accesibilidad, pero no sustituyen una evaluación manual.

Se recomienda complementar los resultados con:

- Navegación mediante teclado.
- Pruebas con lectores de pantalla (NVDA, VoiceOver, JAWS, etc.).
- Evaluaciones con personas usuarias con discapacidad.

---

## Origen del proyecto

Este proyecto nació como parte del curso **Desarrollo Accesible con IA** de weAAAre.

La versión publicada en este repositorio evolucionó significativamente respecto al proyecto original, incorporando nuevos analizadores, una arquitectura modular, automatización del proceso de build, pruebas automatizadas y múltiples mejoras de rendimiento, usabilidad y mantenibilidad.

---

## Licencia

Distribuido bajo licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para más información.
