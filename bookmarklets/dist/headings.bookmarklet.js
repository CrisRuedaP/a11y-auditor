/**
 * BOOKMARKLET INDIVIDUAL - HEADINGS ANALYZER
 * Ejecuta rápidamente el análisis de headings
 * 
 * Uso: javascript:(async()=>{...})()
 */

(async function runHeadingsAudit() {
  try {
    if (window.a11yHeadingsRunning) return;
    window.a11yHeadingsRunning = true;

    // Inyectar estilos si no están
    if (!document.getElementById('a11y-audit-styles')) {
      const style = document.createElement('style');
      style.id = 'a11y-audit-styles';
      style.textContent = `
        .a11y-audit-highlight {
          outline: 2px solid #dc2626 !important;
          outline-offset: 2px !important;
          background-color: rgba(220, 38, 38, 0.1) !important;
        }
        .a11y-audit-popup {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: white;
          border: 2px solid #2563eb;
          border-radius: 8px;
          padding: 16px;
          max-width: 400px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .a11y-audit-popup-close {
          position: absolute;
          top: 8px;
          right: 8px;
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
        }
      `;
      document.head.appendChild(style);
    }

    // Crear popup de resultados
    const popup = document.createElement('div');
    popup.className = 'a11y-audit-popup';
    popup.innerHTML = '<div>Analizando headings...</div>';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'a11y-audit-popup-close';
    closeBtn.textContent = '✕';
    closeBtn.onclick = () => popup.remove();
    popup.appendChild(closeBtn);

    document.body.appendChild(popup);

    // Ejecutar análisis
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));

    if (headings.length === 0) {
      popup.innerHTML = '<strong>No se encontraron headings</strong>';
      return;
    }

    let issues = [];
    const headingLevels = headings.map((h) => ({
      element: h,
      level: parseInt(h.tagName[1]),
      text: h.textContent.trim().substring(0, 60)
    }));

    // Verificar H1
    const h1Count = headingLevels.filter((h) => h.level === 1).length;
    if (h1Count === 0) {
      issues.push('❌ No hay H1');
    } else if (h1Count > 1) {
      issues.push(`⚠️ ${h1Count} H1 encontrados (debe haber 1)`);
    } else {
      issues.push('✓ H1 único');
    }

    // Verificar saltos
    let lastLevel = 0;
    for (let i = 0; i < headingLevels.length; i++) {
      const { element, level } = headingLevels[i];
      const diff = level - lastLevel;

      if (diff > 1 && lastLevel !== 0) {
        issues.push(`⚠️ Salto: H${lastLevel} → H${level}`);
        element.classList.add('a11y-audit-highlight');
      }
      lastLevel = level;
    }

    // Mostrar resultados
    let html = '<strong>📋 Análisis de Headings</strong><hr style="margin: 8px 0;"><ul style="margin: 0; padding-left: 20px; font-size: 12px;">';
    issues.forEach((issue) => {
      html += `<li>${issue}</li>`;
    });
    html += '</ul><hr style="margin: 8px 0;"><small style="color: #6b7280;">Resultados copiados al portapapeles</small>';

    popup.innerHTML = html;
    closeBtn.onclick = () => popup.remove();
    popup.appendChild(closeBtn);

    console.log('%c✓ Análisis de Headings completado', 'color: #16a34a; font-weight: bold;');
    console.log(issues);

    window.a11yHeadingsRunning = false;
  } catch (error) {
    console.error('Error:', error);
    window.a11yHeadingsRunning = false;
  }
})();