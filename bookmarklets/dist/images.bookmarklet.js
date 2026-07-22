/**
 * BOOKMARKLET INDIVIDUAL - IMAGES ANALYZER
 * Valida alt text y accesibilidad de imágenes
 *
 * Uso: javascript:(async()=>{...})()
 */

(async function runImagesAudit() {
  try {
    if (window.a11yImagesRunning) return;
    window.a11yImagesRunning = true;

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

    const closeBtn = document.createElement("button");
    closeBtn.style.cssText =
      "position: absolute; top: 8px; right: 8px; background: none; border: none; font-size: 20px; cursor: pointer;";
    closeBtn.textContent = "✕";
    closeBtn.onclick = () => popup.remove();
    popup.appendChild(closeBtn);

    document.body.appendChild(popup);

    // Analizar imágenes
    const images = Array.from(document.querySelectorAll("img"));
    const svgs = Array.from(document.querySelectorAll("svg"));

    let withoutAlt = [];
    let withAlt = 0;

    images.forEach((img) => {
      const alt = img.getAttribute("alt");
      if (!alt) {
        withoutAlt.push(img);
        img.style.outline = "2px solid #dc2626";
      } else {
        withAlt++;
      }
    });

    svgs.forEach((svg) => {
      const title = svg.querySelector("title");
      const desc = svg.querySelector("desc");
      if (!title && !desc) {
        withoutAlt.push(svg);
        svg.style.outline = "2px solid #dc2626";
      }
    });

    // Mostrar resultados
    let html = `<strong>🖼️ Análisis de Imágenes</strong><hr style="margin: 8px 0;">`;
    html += `<div style="font-size: 12px; margin-bottom: 8px;">`;
    html += `<strong>${images.length + svgs.length}</strong> imágenes encontradas<br>`;
    html += `<strong style="color: #16a34a;">${withAlt}</strong> con alt/descripción<br>`;
    html += `<strong style="color: #dc2626;">${withoutAlt.length}</strong> sin accesibilidad`;
    html += `</div>`;

    if (withoutAlt.length > 0) {
      html += `<hr style="margin: 8px 0;"><small style="color: #6b7280;">Elementos problemáticos resaltados en rojo</small>`;
    }

    popup.innerHTML = html;
    closeBtn.onclick = () => popup.remove();
    popup.appendChild(closeBtn);

    console.log(
      "%c✓ Análisis de Imágenes completado",
      "color: #16a34a; font-weight: bold;",
    );
    console.log("Con alt: %s, Sin alt: %s", withAlt, withoutAlt.length);

    window.a11yImagesRunning = false;
  } catch (error) {
    console.error("Error:", error);
    window.a11yImagesRunning = false;
  }
})();