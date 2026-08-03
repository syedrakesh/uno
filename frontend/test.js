import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  
  // Context A: Admin
  const ctxA = await browser.createBrowserContext();
  const pageA = await ctxA.newPage();
  await pageA.goto('http://localhost:3000/login');
  // fill login
  await pageA.waitForSelector('input[type="email"]');
  await pageA.type('input[type="email"]', 'admin@example.com');
  await pageA.type('input[type="password"]', 'password');
  await pageA.click('button[type="submit"]');
  await pageA.waitForNavigation();
  console.log("A: Logged in as Admin");
  
  // create room
  await pageA.goto('http://localhost:3000/lobby/create');
  await pageA.waitForSelector('button[type="submit"]');
  await pageA.click('button[type="submit"]');
  await pageA.waitForSelector('.btn-success'); // Start Game button
  console.log("A: Created room. Start Game button exists.");
  const roomUrl = pageA.url();
  console.log("Room URL: " + roomUrl);
  
  // Context B: Player 1 (SAME CONTEXT as A to simulate shared localStorage)
  // Wait, if I want to simulate same browser, I just open a new page in ctxA
  const pageB = await ctxA.newPage();
  await pageB.goto('http://localhost:3000/login');
  await pageB.waitForSelector('input[type="email"]');
  // wait! Admin is already logged in, so /login redirects to /dashboard!
  // Let's log out first in Tab B to simulate what the user did?
  // No, the user said "when admin and player 1 login if any user whether admin or player 1 create room and second user join..."
  
  await browser.close();
})();
