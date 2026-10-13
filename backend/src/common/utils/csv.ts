export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
}

// Neutralize CSV formula-injection: spreadsheet apps evaluate cells starting
// with = @ + - (and tab/CR) as formulas. Prefixing with a single quote renders
// them as literal text without changing the visible value meaningfully.
const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

function escapeField(val: string): string {
  const escaped = FORMULA_PREFIXES.includes(val.charAt(0)) ? `'${val}` : val;
  if (
    escaped.includes('"') ||
    escaped.includes(",") ||
    escaped.includes("\n") ||
    escaped.includes("\r")
  ) {
    return `"${escaped.replace(/"/g, '""')}"`;
  }
  return escaped;
}

export function toCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const header = columns.map((c) => escapeField(c.header)).join(",");
  const lines = rows.map((row) =>
    columns
      .map((col) => {
        const raw = col.value(row);
        if (raw == null) return "";
        return escapeField(String(raw));
      })
      .join(","),
  );
  return [header, ...lines].join("\r\n") + "\r\n";
}

/**
 * Parses CSV text into rows of fields. Handles quoted fields, doubled quotes, commas and
 * line breaks inside quotes, CRLF or LF endings and a leading byte-order mark.
 * Blank lines are skipped. A cell that was neutralised on export ("'=...") is not undone.
 */
export function parseCsv(text: string): string[][] {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"' && field === "") {
      quoted = true;
    } else if (ch === ",") {
      endField();
    } else if (ch === "\n") {
      endRow();
    } else if (ch === "\r") {
      if (input[i + 1] === "\n") i += 1;
      endRow();
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) endRow();
  return rows;
}
