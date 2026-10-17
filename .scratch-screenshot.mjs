import { chromium } from "playwright";

const browser = await chromium.launch({
  args: ["--no-sandbox"],
  executablePath: "/home/abdisamadjoe/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome",
});

for (const [label, width] of [["desktop", 1440], ["mobile", 390]]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForSelector("h1");
  await page.screenshot({
    path: `/tmp/claude-1000/-home-abdisamadjoe-Documents-projects-Personal-Gigly/d50b1800-45c4-4cba-b87a-2c3d17f9be29/scratchpad/${label}-full.png`,
    fullPage: true,
  });
  console.log(`${label} (${width}px) console errors:`, errors);
  await page.close();
}

await browser.close();
