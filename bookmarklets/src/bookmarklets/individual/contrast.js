/**
 * BOOKMARKLET INDIVIDUAL - CONTRAST ANALYZER
 * Valida ratios de contraste WCAG
 *
 * Uso: javascript:(async()=>{...})()
 */

(async function runContrastAudit() {
  try {
    if (window.a11yContrastRunning) return;
    window.a11yContrastRunning = true;

    // Crear popup
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
    popup.innerHTML = "<div>Analizando contraste...</div>";

    const closeBtn = document.createElement("button");
    closeBtn.style.cssText =
      "position: absolute; top: 8px; right: 8px; background: none; border: none; font-size: 20px; cursor: pointer;";
    closeBtn.textContent = "✕";
    closeBtn.onclick = () => popup.remove();
    popup.appendChild(closeBtn);

    document.body.appendChild(popup);

    // Utilidades
    function rgbToHex(rgb) {
      const match = rgb.match(/\d+/g);
      if (!match || match.length < 3) return null;
      return (
        "#" +
        [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])]
          .map((x) => {
            const hex = x.toString(16);
            return hex.length === 1 ? "0" + hex : hex;
          })
          .join("")
      );
    }

    function getLuminance(hex) {
      const rgb = parseInt(hex.slice(1), 16);
      const r = (rgb >> 16) & 255;
      const g = (rgb >> 8) & 255;
      const b = rgb & 255;

      const [rs, gs, bs] = [r, g, b].map((x) => {
        x = x / 255;
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
      });

      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }

    function calculateRatio(fg, bg) {
      if (!fg || !bg) return 1;
      const fgLum = getLuminance(fg);
      const bgLum = getLuminance(bg);
      const lighter = Math.max(fgLum, bgLum);
      const darker = Math.min(fgLum, bgLum);
      return (lighter + 0.05) / (darker + 0.05);
    }

    // Analizar elementos
    let contrastIssues = [];
    let checked = 0;

    document
      .querySelectorAll("p, span, a, h1, h2, h3, h4, h5, h6, button, label, li")
      .forEach((el) => {
        if (!el.textContent.trim()) return;

        const style = window.getComputedStyle(el);
        if (style.display === "none") return;

        const fg = rgbToHex(style.color);
        let bg = rgbToHex(style.backgroundColor);

        if (!bg || bg === "#000000") {
          let parent = el.parentElement;
          while (parent) {
            const parentBg = rgbToHex(
              window.getComputedStyle(parent).backgroundColor,
            );
            if (parentBg && parentBg !== "#000000") {
              bg = parentBg;
              break;
            }
            parent = parent.parentElement;
          }
        }

        if (fg && bg) {
          checked++;
          const ratio = calculateRatio(fg, bg);
          if (ratio < 4.5) {
            contrastIssues.push({ element: el, ratio: ratio.toFixed(2) });
            el.style.outline = "2px solid #f59e0b";
          }
        }
      });

    // Mostrar resultados
    let html = `<strong>🎨 Análisis de Contraste</strong><hr style="margin: 8px 0;">`;
    html += `<div style="font-size: 12px; margin-bottom: 8px;">`;
    html += `<strong>${checked}</strong> elementos analizados<br>`;
    html += `<strong style="color: #16a34a;">${checked - contrastIssues.length}</strong> con contraste OK<br>`;
    html += `<strong style="color: #f59e0b;">${contrastIssues.length}</strong> con contraste insuficiente`;
    html += `</div>`;

    if (contrastIssues.length > 0) {
      html += `<hr style="margin: 8px 0;"><small style="color: #6b7280;">Se requiere 4.5:1 (WCAG AA)</small>`;
    }

    popup.innerHTML = html;
    closeBtn.onclick = () => popup.remove();
    popup.appendChild(closeBtn);

    console.log(
      "%c✓ Análisis de Contraste completado",
      "color: #16a34a; font-weight: bold;",
    );
    console.log(
      "Issues: %s, Aprobados: %s",
      contrastIssues.length,
      checked - contrastIssues.length,
    );

    window.a11yContrastRunning = false;
  } catch (error) {
    console.error("Error:", error);
    window.a11yContrastRunning = false;
  }
})();
