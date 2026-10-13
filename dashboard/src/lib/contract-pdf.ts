import { apiFetchBlob } from "@/lib/api";

export interface ContractPdf {
  url: string;
  filename: string;
}

/** Renders the contract PDF on the server and returns a local object URL for it. */
export async function loadContractPdf(path: string, fallbackName: string): Promise<ContractPdf> {
  const { blob, filename } = await apiFetchBlob(path);
  return { url: URL.createObjectURL(blob), filename: filename || `${fallbackName}.pdf` };
}

export function saveContractPdf(pdf: ContractPdf): void {
  const a = document.createElement("a");
  a.href = pdf.url;
  a.download = pdf.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
