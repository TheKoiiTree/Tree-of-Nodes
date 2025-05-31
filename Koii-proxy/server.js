const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = 3000;

app.get('/data', async (req, res) => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('https://explorer.koii.live/address/CSHZ3Fh649Mw6KvpEKfRrkaWuuhM4udMqV2BvSy2tELq', {
    waitUntil: 'networkidle0',
  });

  const result = await page.evaluate(() => {
    const getValueByKey = (key) => {
      const spans = Array.from(document.querySelectorAll('span.object-key'));
      const target = spans.find(span => span.textContent.trim() === key);
      if (target) {
        const valueSpan = target.closest('.variable-row')?.querySelector('.variable-value');
        return valueSpan?.textContent.trim() || "N/A";
      }
      return "N/A";
    };

    const getRawValueByKey = (key) => {
      const spans = Array.from(document.querySelectorAll('span.object-key'));
      const target = spans.find(span => span.textContent.trim() === key);
      if (target) {
        const braceRow = target.closest('.object-key-val')?.querySelector('.brace-row');
        const countMatch = braceRow?.textContent.match(/(\d+)\s+items?/i);
        return countMatch ? countMatch[1] : "N/A";
      }
      return "N/A";
    };

    const totalStake = getValueByKey('total_stake_amount');
    const bounty = getValueByKey('total_bounty_amount');
    const taskName = getValueByKey('task_name');
    const nodeCount = getRawValueByKey('stake_list');

    return {
      taskName,
      totalStake,
      bounty,
      nodeCount
    };
  });

  await browser.close();
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
