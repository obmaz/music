// Serve build/web on port 8765, then: node tests/sng_smoke.cjs
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const errors=[];
 const page=await browser.newPage({viewport:{width:480,height:900},hasTouch:true,isMobile:true});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 const root=process.env.BASE_URL||'http://127.0.0.1:8765';
 fs.mkdirSync('test-results',{recursive:true});
 const state=()=>page.locator('canvas').evaluate(c=>({...c.dataset}));
 const waitScreen=name=>page.waitForFunction(name=>document.querySelector('canvas').dataset.screen===name,name);
 const load=async name=>{
  const chooser=page.waitForEvent('filechooser');
  await page.locator('#local-import').click();
  await (await chooser).setFiles(path.join(__dirname,'fixtures',name));
  await page.waitForFunction(()=>document.querySelector('canvas').dataset.mode==='sng' && document.getElementById('import-status').hidden);
 };
 const at=async time=>page.waitForFunction(t=>window.fivefoldSngTime()>=t,time,{polling:'raf',timeout:10000});
 try{
  await page.goto(root);
  await page.locator('#loading').waitFor({state:'detached',timeout:60000});
  await page.locator('#local-import').waitFor({state:'visible'});
  await load('reference-chart.sng');
  assert.equal((await state()).title,'SNG REFERENCE CHART');
  assert.equal((await state()).difficulty,'3'); // Expert-only preferred over absent Medium.
  await page.screenshot({path:'test-results/sng-menu.png'});
  // Missing Medium is disabled; Easy exists and changes the original chart.
  await page.mouse.click(180,565);
  assert.equal((await state()).difficulty,'3');
  await page.mouse.click(75,565);
  await page.waitForFunction(()=>document.querySelector('canvas').dataset.difficulty==='0');
  // Cycle Guitar -> Bass (Hard only) -> Guitar, then explicitly select Expert.
  await page.mouse.click(170,424);
  await page.waitForFunction(()=>document.querySelector('canvas').dataset.part==='bass');
  assert.equal((await state()).difficulty,'2');
  await page.mouse.click(170,424);
  await page.waitForFunction(()=>document.querySelector('canvas').dataset.part==='guitar');
  await page.mouse.click(400,565);
  await page.waitForFunction(()=>document.querySelector('canvas').dataset.difficulty==='3');
  await page.mouse.click(240,635);
  await waitScreen('playing');
  assert.equal((await state()).noteCount,'9');
  await at(.85);
  await page.keyboard.down('d'); await page.keyboard.down('k');
  await page.keyboard.up('d'); await page.keyboard.up('k');
  await at(1.1); await page.keyboard.down('f');
  await at(2.4); await page.keyboard.up('f');
  await page.waitForFunction(()=>Number(document.querySelector('canvas').dataset.score)>0);
  assert(Number((await state()).judged)>=3);
  await page.screenshot({path:'test-results/sng-game.png'});
  await page.mouse.click(420,33); await waitScreen('paused');
  const before=await page.evaluate(()=>window.fivefoldSngTime());
  await page.waitForTimeout(300);
  assert(Math.abs((await page.evaluate(()=>window.fivefoldSngTime()))-before)<.01,'audio clock pauses');
  await page.mouse.click(240,400); await waitScreen('playing');
  await at(before+.2);
  await waitScreen('results');
  assert.equal((await state()).judged,'9');
  await page.screenshot({path:'test-results/sng-results.png'});
  await page.mouse.click(240,794); await waitScreen('menu');
  // Opus + OGG multi-stem MIDI SNG: decode both, then play through the whole file.
  await page.locator('#track-picker').setInputFiles(path.join(__dirname,'fixtures/reference-midi.sng'));
  await page.waitForFunction(()=>document.querySelector('canvas').dataset.title==='SNG REFERENCE MIDI');
  await page.mouse.click(240,635); await waitScreen('playing');
  assert.equal((await state()).noteCount,'9');
  await at(.8);
  await page.screenshot({path:'test-results/sng-midi.png'});
  await waitScreen('results');
  assert.equal((await state()).judged,'9');
  await page.mouse.click(240,794); await waitScreen('menu');
  // A broken SNG gives a readable error and leaves the previous playable song intact.
  await page.locator('#track-picker').setInputFiles({name:'broken.sng',mimeType:'application/octet-stream',buffer:Buffer.from('broken')});
  await page.waitForFunction(()=>document.querySelector('canvas').dataset.importError);
  assert.equal((await state()).title,'SNG REFERENCE MIDI');
  await page.mouse.click(340,792);
  await page.waitForFunction(()=>document.querySelector('canvas').dataset.mode==='demo');
  for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
   await page.setViewportSize(viewport); await page.waitForTimeout(300);
   const b=await page.locator('#local-import').boundingBox();
   assert(b.x>=0 && b.x+b.width<=viewport.width);
   await page.screenshot({path:`test-results/sng-${viewport.width}.png`});
  }
  assert.deepEqual(errors,[]);
  console.log('SNG web checks passed: official .chart/MIDI packages, OGG/Opus stems, real notes/difficulties, scoring/holds, pause/resume, complete sessions, errors, demo restore, mobile layout.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
