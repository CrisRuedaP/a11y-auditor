/**
 * Shared constants for tagging each finding with its WCAG criterion
 * (2.1/2.2) and conformance level, or "buena práctica" (best practice) when
 * the check is a reasonable convention but WCAG doesn't strictly require it.
 *
 * Imported by every analyzer — lives in a single place so build.js can
 * concatenate it without name clashes across files.
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
