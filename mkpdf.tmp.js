const puppeteer = require('puppeteer-core');
const fs = require('fs');
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const p = await b.newPage();
  await p.setContent(`<h1>Iceland Volcanoes and Glaciers</h1>
    <p>Prepared for Dubai College. Seven days from Reykjavik along the south coast,
    walking on a glacier and standing behind a waterfall.</p>
    <p>Day 1: Arrive Keflavik, transfer to Reykjavik, orientation walk and dinner.</p>
    <p>Included: return flights, half board, all entrance fees, English-speaking guide.</p>`);
  fs.writeFileSync('sample-proposal.pdf', await p.pdf({ format: 'A4' }));
  console.log('wrote sample-proposal.pdf');
  await b.close();
})();
