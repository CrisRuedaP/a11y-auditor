/**
 * Analizador de Formularios
 * Valida labels, inputs, validación accesible, etc
 */
import Analyzer from "../core/analyzer.js";

class FormsAnalyzer extends Analyzer {
  constructor() {
    super("Formularios", "Análisis de formularios y accesibilidad");
  }

  async run() {
    this.reset();

    const inputs = this._querySelectorAll("input, select, textarea").filter(
      (input) => this._isVisible(input),
    );
    const labels = this._querySelectorAll("label");

    if (inputs.length === 0) {
      this.markPassed();
      return this.getSummary();
    }

    // Analizar inputs
    inputs.forEach((input) => {
      const id = input.getAttribute("id");
      const name = input.getAttribute("name");
      const type = input.getAttribute("type") || "text";
      const ariaLabel = input.getAttribute("aria-label");
      const ariaLabelledBy = input.getAttribute("aria-labelledby");
      const required =
        input.getAttribute("required") || input.getAttribute("aria-required");
      const disabled = input.disabled;

      // Validar tipo
      const validTypes = [
        "text",
        "password",
        "email",
        "number",
        "tel",
        "url",
        "search",
        "date",
        "time",
        "datetime-local",
        "month",
        "week",
        "color",
        "range",
        "file",
        "submit",
        "reset",
        "button",
        "checkbox",
        "radio",
        "hidden",
      ];

      if (!validTypes.includes(type)) {
        this.addIssue(
          "warning",
          `Tipo de input no estándar: "${type}"`,
          input,
          { type },
        );
      }

      // Validar etiqueta
      let hasLabel = false;

      if (ariaLabel || ariaLabelledBy) {
        hasLabel = true;
      } else if (id && document.querySelector(`label[for="${id}"]`)) {
        hasLabel = true;
      } else if (input.closest("label")) {
        // Label implícito: <label>Nombre <input></label>, válido sin for/id
        hasLabel = true;
      }

      // Algunos tipos no requieren label
      if (
        !hasLabel &&
        type !== "hidden" &&
        type !== "submit" &&
        type !== "reset" &&
        type !== "button"
      ) {
        this.addIssue(
          "error",
          `Input sin label asociado (id: ${id || "sin id"})`,
          input,
          {
            type,
            id: id || null,
          },
        );
      } else {
        this.markPassed();
      }

      // Validar atributos requeridos
      if (required) {
        this.markPassed();
      }

      // Validar que input disabled tenga indicación visual
      if (disabled) {
        const style = this._getComputedStyle(input);
        if (style.opacity !== "1") {
          this.markPassed();
        }
      }
    });

    // Analizar labels
    labels.forEach((label) => {
      const forAttr = label.getAttribute("for");
      const text = label.textContent.trim();

      if (!forAttr) {
        this.addIssue("warning", 'Label sin atributo "for"', label, {
          text: text.substring(0, 50),
        });
      } else {
        const input = document.getElementById(forAttr);
        if (!input) {
          this.addIssue(
            "error",
            `Label con "for" que no existe: ${forAttr}`,
            label,
            {
              for: forAttr,
            },
          );
        } else {
          this.markPassed();
        }
      }

      if (!text) {
        this.addIssue("error", "Label vacío sin texto", label, {
          for: forAttr || null,
        });
      }
    });

    return this.getSummary();
  }
}

export default FormsAnalyzer;
