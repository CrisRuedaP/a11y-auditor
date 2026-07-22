/**
 * Utilidades para manejo de JSON y portapapeles
 */
class JsonUtils {
  /**
   * Serializa resultados a JSON
   */
  static stringify(results, pretty = true) {
    try {
      return JSON.stringify(results, null, pretty ? 2 : 0);
    } catch (error) {
      console.error("Error serializando JSON:", error);
      return JSON.stringify({ error: error.message });
    }
  }

  /**
   * Copia JSON al portapapeles
   */
  static async copyToClipboard(results) {
    try {
      const json = this.stringify(results, true);
      await navigator.clipboard.writeText(json);

      console.log(
        "%c✓ Auditoría copiada al portapapeles",
        "color: #16a34a; font-weight: bold; font-size: 14px;",
      );

      return true;
    } catch (error) {
      console.error("Error copiando al portapapeles:", error);

      // Fallback si clipboard API no funciona
      try {
        const textArea = document.createElement("textarea");
        textArea.value = this.stringify(results, true);
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);

        console.log("✓ Auditoría copiada al portapapeles (método alternativo)");
        return true;
      } catch (fallbackError) {
        console.error("Error con método alternativo:", fallbackError);
        return false;
      }
    }
  }

  /**
   * Loguea resultados en consola de forma legible
   */
  static logResults(results) {
    console.group(
      "%c♿ AUDITORÍA DE ACCESIBILIDAD",
      "color: #2563eb; font-weight: bold; font-size: 16px;",
    );

    // Metadata
    console.group("%cℹ️ Información", "color: #3b82f6; font-weight: bold;");
    console.log("URL:", results.metadata?.url);
    console.log("Timestamp:", results.metadata?.timestamp);
    console.log("Viewport:", results.metadata?.viewport);
    console.groupEnd();

    // Summary
    console.group("%c📊 Resumen", "color: #8b5cf6; font-weight: bold;");
    const summary = results.summary;
    console.log("✓ Aprobados: %s", summary.totalPassed);
    console.log(
      "✗ Errores: %c%s",
      summary.totalFailed > 0 ? "color: #dc2626; font-weight: bold;" : "",
      summary.totalFailed,
    );
    console.log(
      "⚠️  Advertencias: %c%s",
      summary.totalWarnings > 0 ? "color: #f59e0b; font-weight: bold;" : "",
      summary.totalWarnings,
    );
    console.log("Total de issues: %s", summary.totalIssues);
    console.log("Severidad: %c%s", "font-weight: bold;", summary.severity);
    console.groupEnd();

    // Resultados por analizador
    console.group(
      "%c📋 Resultados por Analizador",
      "color: #06b6d4; font-weight: bold;",
    );
    Object.entries(results.results).forEach(([name, result]) => {
      if (result) {
        const hasIssues = result.issues && result.issues.length > 0;
        console.group(
          "%c%s %s (%s/%s/%s)",
          hasIssues ? "color: #f59e0b;" : "color: #16a34a;",
          hasIssues ? "⚠️" : "✓",
          name,
          result.passed,
          result.failed,
          result.warnings,
        );

        if (result.issues && result.issues.length > 0) {
          result.issues.forEach((issue) => {
            const icon =
              issue.severity === "error"
                ? "❌"
                : issue.severity === "warning"
                  ? "⚠️"
                  : "ℹ️";
            console.log("%s %s", icon, issue.message);
            if (issue.selector) {
              console.log("  → %s", issue.selector);
            }
          });
        } else {
          console.log("Sin problemas detectados");
        }

        console.groupEnd();
      }
    });
    console.groupEnd();

    console.groupEnd();
  }

  /**
   * Exporta resultados a CSV
   */
  static exportToCsv(results) {
    const rows = [];
    rows.push(["Analizador", "Severidad", "Mensaje", "Selector", "Metadata"]);

    Object.entries(results.results).forEach(([analyzerName, result]) => {
      if (result.issues) {
        result.issues.forEach((issue) => {
          rows.push([
            analyzerName,
            issue.severity,
            issue.message,
            issue.selector || "",
            JSON.stringify(issue.metadata || {}),
          ]);
        });
      }
    });

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    return csv;
  }

  /**
   * Descarga resultados como archivo JSON
   */
  static downloadJson(results, filename = "a11y-audit.json") {
    const json = this.stringify(results, true);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Descarga resultados como archivo CSV
   */
  static downloadCsv(results, filename = "a11y-audit.csv") {
    const csv = this.exportToCsv(results);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export default JsonUtils;
