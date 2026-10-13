import { apiFetchBlob } from "./api";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Both helpers go through apiFetchBlob so the request carries the bearer token
// the API requires (cookies alone are rejected with a 401).
export async function downloadCsv(path: string): Promise<void> {
  const { blob, filename } = await apiFetchBlob(path);
  saveBlob(blob, filename || "export.csv");
}

export async function downloadFile(fileId: string, filename: string): Promise<void> {
  const { blob } = await apiFetchBlob(`/files/${fileId}/download`);
  saveBlob(blob, filename);
}
