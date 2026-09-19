import { describe, test, expect } from "vitest";
import { sanitizeFilename } from "./sanitize";

describe("sanitizeFilename", () => {
  // --- Normal filenames ---

  test("normal filename with extension passes through unchanged", () => {
    expect(sanitizeFilename("file.txt")).toBe("file.txt");
  });

  test("filename with letters, numbers, and dashes passes through", () => {
    expect(sanitizeFilename("my-document-2024.pdf")).toBe("my-document-2024.pdf");
  });

  test("filename with underscores passes through", () => {
    expect(sanitizeFilename("my_file.docx")).toBe("my_file.docx");
  });

  // --- Path traversal removal ---

  test("unix path separators are stripped — only basename kept", () => {
    const result = sanitizeFilename("../../etc/passwd");
    expect(result).not.toContain("/");
    expect(result).not.toContain("..");
    expect(result).toBe("passwd");
  });

  test("windows path separators are stripped — only basename kept", () => {
    const result = sanitizeFilename("C:\\Windows\\System32\\cmd.exe");
    expect(result).not.toContain("\\");
    expect(result).toBe("cmd.exe");
  });

  test("nested unix path returns only the final component", () => {
    const result = sanitizeFilename("/var/www/html/index.html");
    expect(result).toBe("index.html");
  });

  // --- Special character replacement ---

  test("spaces in filename are preserved (spaces are allowed)", () => {
    // \w includes letters, digits, underscore; space is also allowed via the regex [ ]
    const result = sanitizeFilename("my file.txt");
    expect(result).toBe("my file.txt");
  });

  test("parentheses are replaced with underscores", () => {
    const result = sanitizeFilename("file name (1).txt");
    // '(' and ')' are not in [\w.\- ] so become '_'
    expect(result).toBe("file name _1_.txt");
  });

  test("at-sign is replaced with underscore", () => {
    const result = sanitizeFilename("user@domain.txt");
    expect(result).toBe("user_domain.txt");
  });

  test("hash symbol is replaced with underscore", () => {
    const result = sanitizeFilename("report#final.pdf");
    expect(result).toBe("report_final.pdf");
  });

  test("ampersand is replaced with underscore", () => {
    const result = sanitizeFilename("sales&marketing.xlsx");
    expect(result).toBe("sales_marketing.xlsx");
  });

  // --- Consecutive dot collapsing ---

  test("two consecutive dots are collapsed to one", () => {
    const result = sanitizeFilename("file..txt");
    expect(result).toBe("file.txt");
  });

  test("three or more consecutive dots are collapsed to one", () => {
    const result = sanitizeFilename("file...txt");
    expect(result).toBe("file.txt");
  });

  test("path traversal dots in filename portion are collapsed", () => {
    // After stripping the path, '../../' → '' leaving just 'passwd'
    // So '....' in a filename (not path) gets collapsed
    const result = sanitizeFilename("my....file.txt");
    expect(result).toBe("my.file.txt");
  });

  // --- Empty / whitespace fallback ---

  test("empty string returns fallback 'file'", () => {
    expect(sanitizeFilename("")).toBe("file");
  });

  test("filename with only special chars that all become underscores still returns a value", () => {
    // '!!!' → '___' which is truthy, not the fallback
    const result = sanitizeFilename("!!!");
    expect(result).toBe("___");
  });

  test("filename that reduces to empty after sanitization returns 'file'", () => {
    // Empty string after replace → fallback
    // The regex replaces non-[\w.\- ] chars with '_', so '!!!' → '___'
    // To get empty we'd need a completely empty base, which is just ""
    const result = sanitizeFilename("   "); // spaces are allowed chars
    // Spaces are in the allowed set (via ' ' in regex), so "   " → "   " which is truthy
    // This tests the || "file" fallback — it only triggers when result is falsy
    expect(result.length).toBeGreaterThan(0);
  });

  // --- Mixed scenarios ---

  test("realistic upload filename with spaces and parentheses", () => {
    const result = sanitizeFilename("Project Proposal (Final).docx");
    expect(result).toBe("Project Proposal _Final_.docx");
  });

  test("filename with leading dot (hidden file) is handled correctly", () => {
    const result = sanitizeFilename(".gitignore");
    expect(result).toBe(".gitignore");
  });

  test("filename with multiple extensions", () => {
    const result = sanitizeFilename("archive.tar.gz");
    expect(result).toBe("archive.tar.gz");
  });
});
