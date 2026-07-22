# Decisiones Arquitectónicas - Bookmarklets de Accesibilidad

## Visión General

Sistema modular de bookmarklets para auditoría de accesibilidad con panel visual interactivo y exportación JSON para uso con LLMs.

## Decisiones Principales

### 1. Arquitectura de Módulos Independientes

**Decisión:** Cada analizador es una clase independiente que hereda de `Analyzer`

**Razón:**

- Permite desarrollar en paralelo
- Facilita agregar nuevos analizadores
- Cada uno puede ejecutarse independientemente
- Código reutilizable

**Implementación:**

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

### 2. Panel Lateral No Invasivo

**Decisión:** UI en panel lateral fijo en `position: fixed`, no popup flotante

**Razón:**

- No interfiere con navegación de página
- Fácil de cerrar
- Permite ver página y resultados simultáneamente
- Responsive en mobile (se convierte en bottom sheet)

### 3. Dos Formas de Acceso

**Decisión:** 1 bookmarklet principal + 4 individuales

**Razón:**

- Bookmarklet principal: auditoría completa, panel con menú
- Bookmarklets individuales: auditoría rápida, popup ligero
- Flexibilidad según necesidad del usuario
- Usuarios rápidos vs usuarios profundos

### 4. Exportación JSON Automática

**Decisión:** Console.log + portapapeles automático

**Razón:**

- No requiere servidor
- LLMs pueden acceder directamente
- Portapapeles permite workflow fluid
- Console permite debugging

**No implementado:**

- API/Webhooks (complejidad innecesaria)
- Descarga de archivo (menos accesible)

### 5. Análisis de Página Completa

**Decisión:** Auditar todo el DOM, no solo viewport o elemento seleccionado

**Razón:**

- Da vista completa de problemas
- Más útil para auditorías iniciales
- Usuario puede scrollear para ver resaltados

**Consideración futura:** Selector de elemento para análisis enfocados

### 6. Estilos Inlineados

**Decisión:** CSS inyectado directamente en el `<style>` tag

**Razón:**

- No requiere archivo externo
- Funciona en cualquier contexto (CORS, file://, etc)
- Bookmarklet más autónomo

### 7. Sin Librerías Externas (Excepto Axe-Core)

**Decisión:** Código vanilla JavaScript, axe-core cargado dinámicamente

**Razón:**

- Bookmarklets minificados más pequeños
- Sin webpack/bundler requerido
- Axe-core es estándar industria (excepción válida)

### 8. Severidad en Tres Niveles

**Decisión:** error, warning, info

**Razón:**

- Priorización clara para usuario
- Colores visuales consistentes
- Facilita exportación a CSV/sistemas externos

### 9. Metadatos en Cada Issue

**Decisión:** Guardar selector CSS, tag, id, classes, texto, metadata personalizada

**Razón:**

- Usuario puede encontrar elemento después
- LLM tiene contexto para recomendaciones
- Debug más fácil

### 10. UI Modular Separada

**Decisión:** Clase `AuditUI` independiente de `Auditor`

**Razón:**

- Auditor puede usarse sin UI (testing, CLI)
- UI puede reemplazarse por otra versión
- Separación de responsabilidades
- Testeable

## Analizadores Específicos

### Headings

**Lógica:**

1. Buscar h1-h6
2. Validar único H1
3. Detectar saltos (h1 → h3)
4. Detectar vacíos

**Decisión:** No validar orden alfabético de títulos

### Axe-Core

**Lógica:**

1. Cargar librería desde CDN
2. Ejecutar `axe.run()`
3. Procesar violations/passes

**Decisión:** Cargar dinámicamente para no aumentar tamaño bookmarklet

### Imágenes

**Lógica:**

1. Buscar IMG, SVG, background-images
2. Validar alt/title/desc
3. Detectar alt vacío

**Decisión:** No hacer OCR de imágenes (fuera de alcance)

### Contraste

**Lógica:**

1. Calcular luminancia WCAG
2. Obtener colores foreground/background
3. Buscar en padres si background transparent
4. Calcular ratio (Lighter + 0.05) / (Darker + 0.05)

**Decisión:** Usar fórmula WCAG 2.0 estándar, no algoritmos propietarios

### ARIA

**Lógica:**

1. Validar roles contra lista ARIA 1.2
2. Validar aria-labelledby/describedby apuntan a IDs reales

**Decisión:** No validar propiedades ARIA complejas (demasiado contexto)

### Formularios

**Lógica:**

1. Buscar input, select, textarea
2. Validar label con `for`
3. Validar tipo de input
4. Validar required/aria-required

**Decisión:** No validar lógica de validación custom

### Semántica

**Lógica:**

1. Detectar presencia de main, header, footer
2. Validar section/article tienen h1-h6
3. Contar divs vs etiquetas semánticas

**Decisión:** No imponer estructura específica (puede variar)

### Teclado

**Lógica:**

1. Detectar elementos interactivos
2. Validar tabindex positivo/negativo
3. Detectar divs con onclick sin role
4. Verificar focus visible

**Decisión:** No automatizar prueba de orden Tab (requiere simulación)

### Links

**Lógica:**

1. Detectar texto de enlace genérico ("click aquí", "leer más", etc)
2. Detectar enlaces sin `href` real (ausente, vacío, `#`, `javascript:void(0)`)
3. Detectar `target="_blank"` sin aviso en el texto/aria-label ni `rel="noopener"`

**Decisión:** No resolver si el destino responde (requeriría red); solo se valida markup

## Estándares Usados

### WCAG 2.2

- Nivel AA: Contraste 4.5:1 normal, 3:1 grande
- Nivel AAA: Contraste 7:1 normal, 4.5:1 grande

### Fórmula de Contraste

```
RsRGB = R/255
Si RsRGB <= 0.03928 entonces RsRGB = RsRGB/12.92
Si no, entonces RsRGB = ((RsRGB+0.055)/1.055) ^ 2.4

Luminancia = 0.2126 * R + 0.7152 * G + 0.0722 * B

Contrast = (L1 + 0.05) / (L2 + 0.05)
Donde L1 es luminancia más clara, L2 más oscura
```

### ARIA 1.2 Roles Válidos

Lista de 51 roles validados contra especificación ARIA

## Sitio Web

### index.html

- Hero con un mockup de "página anotada" que reproduce el mismo lenguaje
  visual del panel real (etiqueta + resaltado sobre el elemento con problema)
- Grid de instalación conectado a `bookmarklets.data.js` (generado por
  `build.js`), no a código de ejemplo
- Grid de los 9 analizadores con un hallazgo real de ejemplo por analizador

### results-viewer.html

- Carga JSON desde portapapeles/archivo/textarea
- Visualiza metadatos y resumen
- Grid de analizadores con issues por severidad

### install-guide.html

- Instalación (arrastrar + manual)
- Guía por analizador
- FAQ como botones reales con `aria-expanded` (no divs con onclick)

## Performance

### Optimizaciones

- Lazy load de axe-core (solo si se solicita)
- Análisis no bloquea UI (potencial: Web Workers)
- Selector CSS cacheado
- Estilos compilados en CSS (sin SASS)

### Tamaño

- Bookmarklet principal: ~35KB codificado como `javascript:` URI
- Bookmarklets individuales: ~5-8KB cada uno
- No se minifica el código (comentarios incluidos): al ir codificado con
  `encodeURIComponent` ya es una única línea válida para un marcador, y el
  tamaño extra es irrelevante para uso local

## Consideraciones Futuras

### High Priority

- [ ] Soporte para Web Workers (análisis no bloqueante)
- [ ] Historial de auditorías (localStorage)
- [ ] Filtrado de resultados por tipo/severidad

### Medium Priority

- [ ] Integración con herramientas (Jira, GitHub)
- [ ] Comparación de auditorías (antes/después)
- [ ] Exportación a PDF/HTML
- [ ] Modo oscuro en panel

### Low Priority

- [ ] Selector manual de elementos
- [ ] Profiler de performance
- [ ] Análisis de imágenes (OCR)
- [ ] Integración con CI/CD

## Testing

### Pruebas Manuales Necesarias

1. Página con issues conocidos de cada tipo
2. Página grande (>10MB DOM)
3. Página con frames/iframes
4. Página con sombra DOM
5. Página HTTPS/segura

### No Automatizado

- Lectura real con screen readers
- Navegación con teclado en vivo
- Experiencia de usuario real

## Notas para Desarrolladores

### Agregar Analizador

1. Crear `src/analyzers/myanalyzer.js`
2. Hereda de `Analyzer`
3. Implementar `async run()`
4. Llamar `addIssue()` para problemas
5. Llamar `markPassed()` para éxitos
6. Agregar a `auditor.js`
7. Crear bookmarklet individual opcional

### Debug

```javascript
// En consola del navegador:
window.a11yAuditResults; // Últimos resultados
window.a11yAuditorInstance; // Referencia al auditor
```

### Modificar UI

Los estilos están en `core/ui.js` método `_injectStyles()`. CSS clase base `.a11y-audit-*`.

## Decisiones Rechazadas

### Chrome Extension

**Por qué no:** Requiere instalación, permisos, menos portable

### Herramienta CLI Standalone

**Por qué no:** Desvía del propósito de bookmarklets, requiere Node.js

### Base de Datos Remota

**Por qué no:** Privacidad, GDPR, complejidad innecesaria

### React/Vue

**Por qué no:** Tamaño bundle, overkill para UI simple

### Shadow DOM para UI

**Por qué no:** Conflictos con estilos de página, complejidad

---

**Última actualización:** 2026-07-22
