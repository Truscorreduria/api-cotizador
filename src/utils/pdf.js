// utils/pdf.js
import puppeteer from "puppeteer";

export async function renderPdfFromHtml(html) {
  const browser = await puppeteer.launch({
    headless: "new",
    // En servidores Linux suele requerirse:
    // args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.emulateMediaType("screen");

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "12mm", bottom: "20mm", left: "12mm" },
    });

    // 👇 Asegura que sea Buffer (aunque Puppeteer devuelva Uint8Array)
    return Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
