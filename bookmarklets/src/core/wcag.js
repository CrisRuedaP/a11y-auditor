/**
 * Constantes compartidas para etiquetar cada hallazgo con su criterio WCAG
 * (2.1/2.2) y nivel de conformancia, o "buena práctica" cuando el chequeo
 * es una convención razonable pero WCAG no lo exige puntualmente.
 *
 * Importado por todos los analizadores — vive en un solo lugar para que
 * build.js pueda concatenarlo sin choques de nombres entre archivos.
 */
export const BEST_PRACTICE = { criterion: null, level: "buena práctica" };

export const WCAG = {
  NON_TEXT_CONTENT: { criterion: "1.1.1", level: "A" },
  INFO_RELATIONSHIPS: { criterion: "1.3.1", level: "A" },
  CONTRAST_MINIMUM: { criterion: "1.4.3", level: "AA" },
  KEYBOARD: { criterion: "2.1.1", level: "A" },
  BYPASS_BLOCKS: { criterion: "2.4.1", level: "A" },
  FOCUS_ORDER: { criterion: "2.4.3", level: "A" },
  LINK_PURPOSE: { criterion: "2.4.4", level: "A" },
  CHANGE_ON_REQUEST: { criterion: "3.2.5", level: "AAA" },
  LABELS_INSTRUCTIONS: { criterion: "3.3.2", level: "A" },
  NAME_ROLE_VALUE: { criterion: "4.1.2", level: "A" },
};
