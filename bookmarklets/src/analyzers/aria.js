/**
 * Analizador de ARIA
 * Valida atributos ARIA, roles, propiedades, etc
 */
import Analyzer from "../core/analyzer.js";

class AriaAnalyzer extends Analyzer {
  constructor() {
    super("ARIA", "Análisis de atributos ARIA");
  }

  async run() {
    this.reset();

    const ariaElements = this._querySelectorAll(
      "[role], [aria-label], [aria-labelledby], [aria-describedby], [aria-hidden], [aria-live]",
    );

    if (ariaElements.length === 0) {
      this.markPassed();
      return this.getSummary();
    }

    const validRoles = [
      "alert",
      "alertdialog",
      "application",
      "article",
      "banner",
      "button",
      "checkbox",
      "columnheader",
      "combobox",
      "complementary",
      "contentinfo",
      "definition",
      "dialog",
      "directory",
      "document",
      "feed",
      "figure",
      "form",
      "grid",
      "gridcell",
      "group",
      "heading",
      "img",
      "link",
      "list",
      "listbox",
      "listitem",
      "log",
      "main",
      "marquee",
      "math",
      "menu",
      "menubar",
      "menuitem",
      "menuitemcheckbox",
      "menuitemradio",
      "navigation",
      "none",
      "note",
      "option",
      "presentation",
      "progressbar",
      "radio",
      "radiogroup",
      "region",
      "row",
      "rowgroup",
      "rowheader",
      "scrollbar",
      "search",
      "searchbox",
      "separator",
      "slider",
      "spinbutton",
      "status",
      "switch",
      "tab",
      "table",
      "tablist",
      "tabpanel",
      "term",
      "textbox",
      "timer",
      "toolbar",
      "tooltip",
      "tree",
      "treegrid",
      "treeitem",
    ];

    ariaElements.forEach((element) => {
      const role = element.getAttribute("role");
      const ariaLabel = element.getAttribute("aria-label");
      const ariaLabelledBy = element.getAttribute("aria-labelledby");
      const ariaDescribedBy = element.getAttribute("aria-describedby");

      // Validar role
      if (role && !validRoles.includes(role)) {
        this.addIssue("error", `Rol ARIA inválido: "${role}"`, element, {
          invalidRole: role,
        });
      } else if (role) {
        this.markPassed();
      }

      // Validar aria-labelledby
      if (ariaLabelledBy) {
        const ids = ariaLabelledBy.split(" ");
        let allExist = true;
        ids.forEach((id) => {
          if (!document.getElementById(id)) {
            allExist = false;
          }
        });

        if (!allExist) {
          this.addIssue(
            "error",
            "aria-labelledby referencia IDs inexistentes",
            element,
            {
              aria_labelledby: ariaLabelledBy,
            },
          );
        } else {
          this.markPassed();
        }
      }

      // Validar aria-describedby
      if (ariaDescribedBy) {
        const ids = ariaDescribedBy.split(" ");
        let allExist = true;
        ids.forEach((id) => {
          if (!document.getElementById(id)) {
            allExist = false;
          }
        });

        if (!allExist) {
          this.addIssue(
            "error",
            "aria-describedby referencia IDs inexistentes",
            element,
            {
              aria_describedby: ariaDescribedBy,
            },
          );
        } else {
          this.markPassed();
        }
      }

      // Validar que elementos interactivos tengan accesibilidad
      const tagName = element.tagName.toLowerCase();
      const isInteractive = [
        "button",
        "a",
        "input",
        "select",
        "textarea",
      ].includes(tagName);

      if (
        isInteractive &&
        !ariaLabel &&
        !ariaLabelledBy &&
        !element.textContent.trim()
      ) {
        this.addIssue(
          "error",
          "Elemento interactivo sin etiqueta accesible",
          element,
          {
            tag: tagName,
          },
        );
      }
    });

    return this.getSummary();
  }
}

export default AriaAnalyzer;
