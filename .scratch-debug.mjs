import { chromium } from "playwright";
const browser = await chromium.launch({
  args: ["--no-sandbox"],
  executablePath: "/home/abdisamadjoe/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
const img = page.locator('img[src="/illustrations/contract.svg"]');
await img.scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
const nat = await img.evaluate(el => ({naturalWidth: el.naturalWidth, naturalHeight: el.naturalHeight, complete: el.complete, src: el.currentSrc}));
console.log("natural after scroll:", nat);
await page.screenshot({ path: "/tmp/claude-1000/-home-abdisamadjoe-Documents-projects-Personal-Gigly/d50b1800-45c4-4cba-b87a-2c3d17f9be29/scratchpad/block3.png" });
await browser.close();
