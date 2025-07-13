import type { NextApiRequest, NextApiResponse } from 'next';
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let result = null;
  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    let page = await browser.newPage();
    await page.goto('https://example.com');
    result = await page.title();
    await browser.close();
    res.status(200).json({ success: true, result });
  } catch (error) {
    if (browser !== null) {
      await browser.close();
    }
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
} 