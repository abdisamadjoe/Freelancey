import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "./csv";
import type { CsvColumn } from "./csv";

interface TestRow {
  name: string;
  age: number;
  note?: string | null;
}

const columns: CsvColumn<TestRow>[] = [
  { header: "Name", value: (r) => r.name },
  { header: "Age", value: (r) => r.age },
  { header: "Note", value: (r) => r.note },
];

describe("toCsv", () => {
  it("produces header row", () => {
    const csv = toCsv(columns, []);
    expect(csv).toBe("Name,Age,Note\r\n");
  });

  it("produces data rows", () => {
    const csv = toCsv(columns, [
      { name: "Alice", age: 30, note: "hello" },
      { name: "Bob", age: 25 },
    ]);
    const lines = csv.trim().split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("Name,Age,Note");
    expect(lines[1]).toBe("Alice,30,hello");
    expect(lines[2]).toBe("Bob,25,");
  });

  it("escapes commas in fields", () => {
    const csv = toCsv(columns, [{ name: "Doe, Jane", age: 28 }]);
    const lines = csv.trim().split("\r\n");
    expect(lines[1]).toBe('"Doe, Jane",28,');
  });

  it("escapes double quotes by doubling them", () => {
    const csv = toCsv(columns, [{ name: 'Say "hi"', age: 22 }]);
    const lines = csv.trim().split("\r\n");
    expect(lines[1]).toBe('"Say ""hi""",22,');
  });

  it("escapes newlines in fields", () => {
    const csv = toCsv(columns, [{ name: "Line1\nLine2", age: 20 }]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe('"Line1\nLine2",20,');
  });

  it("handles null and undefined values as empty strings", () => {
    const csv = toCsv(columns, [{ name: "Test", age: 0, note: null }]);
    const lines = csv.trim().split("\r\n");
    expect(lines[1]).toBe("Test,0,");
  });

  it("neutralizes formula-injection prefixes (= + - @ tab CR)", () => {
    const csv = toCsv(columns, [
      { name: "=SUM(A1:A9)", age: 1, note: "+1" },
      { name: "-2+3", age: 2, note: "@cmd" },
      { name: "\tevil", age: 3, note: "\rnope" },
    ]);
    const lines = csv.trim().split("\r\n");
    expect(lines[1]).toBe("'=SUM(A1:A9),1,'+1");
    expect(lines[2]).toBe("'-2+3,2,'@cmd");
    expect(lines[3]).toBe(`'\tevil,3,"'\rnope"`);
  });
});

describe("parseCsv", () => {
  it("splits simple rows and ignores blank lines", () => {
    expect(parseCsv("a,b\n1,2\n\n3,4\n")).toEqual([["a", "b"], ["1", "2"], ["3", "4"]]);
  });

  it("handles CRLF, a BOM and a missing final newline", () => {
    expect(parseCsv("\uFEFFa,b\r\n1,2")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("handles quoted commas, doubled quotes and line breaks inside quotes", () => {
    expect(parseCsv('name,note\n"Acme, Inc","says ""hi"""\n"Two\nLines",x')).toEqual([
      ["name", "note"],
      ["Acme, Inc", 'says "hi"'],
      ["Two\nLines", "x"],
    ]);
  });

  it("keeps empty fields", () => {
    expect(parseCsv("a,,c\n,,")).toEqual([["a", "", "c"]]);
  });

  it("round-trips what toCsv writes", () => {
    const cols: CsvColumn<{ a: string; b: string }>[] = [
      { header: "A", value: (r) => r.a },
      { header: "B", value: (r) => r.b },
    ];
    const rows = [{ a: 'x, "y"', b: "line\nbreak" }, { a: "plain", b: "" }];
    expect(parseCsv(toCsv(cols, rows))).toEqual([["A", "B"], ['x, "y"', "line\nbreak"], ["plain", ""]]);
  });

  it("returns nothing for empty input", () => {
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv("\n\n")).toEqual([]);
  });
});
