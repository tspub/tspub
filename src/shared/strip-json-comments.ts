/**
 * Strip single-line (//) and multi-line comments from JSON-like text,
 * while preserving content inside quoted strings (e.g., URLs).
 * Also strips trailing commas before } or ].
 */
export function stripJsonComments(text: string): string {
  let result = "";
  let i = 0;
  const len = text.length;

  while (i < len) {
    const ch = text[i]!;

    // Quoted string — copy verbatim
    if (ch === '"') {
      let j = i + 1;
      while (j < len) {
        if (text[j] === "\\") {
          j += 2;
        } else if (text[j] === '"') {
          j++;
          break;
        } else {
          j++;
        }
      }
      result += text.slice(i, j);
      i = j;
      continue;
    }

    // Single-line comment
    if (ch === "/" && text[i + 1] === "/") {
      let j = i + 2;
      while (j < len && text[j] !== "\n") j++;
      i = j;
      continue;
    }

    // Multi-line comment
    if (ch === "/" && text[i + 1] === "*") {
      let j = i + 2;
      while (j < len && !(text[j] === "*" && text[j + 1] === "/")) j++;
      i = j + 2;
      continue;
    }

    result += ch;
    i++;
  }

  // Strip trailing commas before } or ]
  return result.replace(/,\s*([}\]])/g, "$1");
}
