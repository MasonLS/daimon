/**
 * Client-side text extraction from files.
 * PDF.js is loaded dynamically to avoid SSR issues.
 */

export async function extractTextFromFile(file: File): Promise<string> {
  const filename = file.name.toLowerCase();

  if (
    file.type === "text/plain" ||
    file.type === "text/markdown" ||
    filename.endsWith(".txt") ||
    filename.endsWith(".md")
  ) {
    return file.text();
  }

  if (file.type === "application/pdf" || filename.endsWith(".pdf")) {
    return extractPdfText(file);
  }

  if (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    filename.endsWith(".docx")
  ) {
    return extractDocxText(file);
  }

  return file.text();
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");

  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const textParts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    textParts.push(text);
  }

  return textParts.join("\n\n");
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
