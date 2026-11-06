// Run with docs served at http://127.0.0.1:8765.
// npm install playwright; CHROMIUM=/usr/bin/chromium node tests/web_smoke.cjs
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const BASE=process.env.BASE_URL||'http://127.0.0.1:8765';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
 const errors=[];
 fs.mkdirSync('test-results',{recursive:true});
 try {
  const page=await browser.newPage({viewport:{width:480,height:900},deviceScaleFactor:1,hasTouch:true,isMobile:true});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto(BASE);
  await page.locator('#loading').waitFor({state:'detached',timeout:60000});
  await page.locator('#local-import').waitFor({state:'visible'});
  await page.screenshot({path:'test-results/menu.png'});
  await page.mouse.click(240,635);
  await page.locator('#local-import').waitFor({state:'hidden'});
  await page.waitForTimeout(7200);
  await page.keyboard.press('d');
  await page.keyboard.press('f');
  await page.screenshot({path:'test-results/game.png'});
  await page.mouse.click(420,33);
  await page.waitForTimeout(500);
  await page.screenshot({path:'test-results/pause.png'});
  await page.mouse.click(240,543);
  await page.locator('#local-import').waitFor({state:'visible'});
  const picker=page.waitForEvent('filechooser');
  await page.locator('#local-import').click();
  await (await picker).setFiles(path.join(__dirname,'../assets/night-circuit.ogg'));
  await page.waitForTimeout(1500);
  await page.screenshot({path:'test-results/local.png'});
  await page.mouse.click(120,792);
  await page.locator('#local-import').waitFor({state:'hidden'});
  await page.waitForTimeout(300);
  await page.screenshot({path:'test-results/settings.png'});
  await page.mouse.click(240,786);
  await page.locator('#local-import').waitFor({state:'visible'});
  // A full unplayed session must reach results, rather than hang at the end.
  await page.mouse.click(240,635);
  await page.locator('#local-import').waitFor({state:'hidden'});
  await page.waitForTimeout(71500);
  await page.screenshot({path:'test-results/results.png'});
  await page.mouse.click(240,794);
  await page.locator('#local-import').waitFor({state:'visible',timeout:5000});
  // Check the typical narrow mobile viewport and desktop letterboxing.
  for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
   await page.setViewportSize(viewport);
   await page.waitForTimeout(400);
   const button=await page.locator('#local-import').boundingBox();
   assert(button.x>=0 && button.x+button.width<=viewport.width);
   assert(button.y>=0 && button.y+button.height<=viewport.height);
   await page.screenshot({path:`test-results/menu-${viewport.width}.png`});
  }
  assert.deepEqual(errors,[],'No JavaScript or Godot runtime errors');
  console.log('Web smoke passed: play, pause, local file picker, settings, complete session, responsive layout.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
