/**
 * BOOKMARKLET INDIVIDUAL - AXECORE ANALYZER
 * Ejecuta axe-core para detectar issues de accesibilidad
 *
 * Uso: javascript:(async()=>{...})()
 */

(async function runAxeAudit() {
  try {
    if (window.a11yAxeRunning) return;
    window.a11yAxeRunning = true;

    // Mostrar loading
    const popup = document.createElement("div");
    popup.className = "a11y-audit-popup";
    popup.style.cssText = `
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
    `;
    popup.innerHTML = "<div>Cargando axe-core y analizando...</div>";

    const closeBtn = document.createElement("button");
    closeBtn.style.cssText =
      "position: absolute; top: 8px; right: 8px; background: none; border: none; font-size: 20px; cursor: pointer;";
    closeBtn.textContent = "✕";
    closeBtn.onclick = () => popup.remove();
    popup.appendChild(closeBtn);

    document.body.appendChild(popup);

    // Cargar axe-core
    if (!window.axe) {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js";
      script.onload = runAxe;
      script.onerror = () => {
        popup.textContent = "❌ Error cargando axe-core";
      };
      document.head.appendChild(script);
    } else {
      runAxe();
    }

    function runAxe() {
      window.axe.run((err, results) => {
        if (err) {
          popup.innerHTML = `<strong>❌ Error</strong><br>${err}`;
          closeBtn.onclick = () => popup.remove();
          popup.appendChild(closeBtn);
          return;
        }

        const violations = results.violations || [];
        const passes = results.passes || [];

        let html = `<strong>🔍 Axe-Core Results</strong><hr style="margin: 8px 0;">`;
        html += `<div style="font-size: 12px; margin-bottom: 8px;">`;
        html += `<strong style="color: #dc2626;">❌ Violations: ${violations.length}</strong><br>`;
        html += `<strong style="color: #16a34a;">✓ Passes: ${passes.length}</strong>`;
        html += `</div><hr style="margin: 8px 0;">`;

        if (violations.length > 0) {
          html +=
            '<strong style="font-size: 12px;">Top Issues:</strong><ul style="margin: 0; padding-left: 20px; font-size: 11px;">';
          violations.slice(0, 5).forEach((v) => {
            html += `<li><strong>${v.id}</strong>: ${v.help}</li>`;
          });
          if (violations.length > 5) {
            html += `<li>... y ${violations.length - 5} más</li>`;
          }
          html += "</ul>";
        }

        popup.innerHTML = html;
        closeBtn.onclick = () => popup.remove();
        popup.appendChild(closeBtn);

        console.log(
          "%c✓ Axe-Core completado",
          "color: #16a34a; font-weight: bold;",
        );
        console.log(
          "Violations: %s, Passes: %s",
          violations.length,
          passes.length,
        );
        console.log(results);

        window.a11yAxeRunning = false;
      });
    }
  } catch (error) {
    console.error("Error:", error);
    window.a11yAxeRunning = false;
  }
})();