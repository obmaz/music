// Serve build/ on port 8767; /web/ deliberately tests a GitHub Pages subpath.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const os=require('node:os');
(async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'fivefold-app-'));
 const context=await chromium.launchPersistentContext(profile,{executablePath:process.env.CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader'],viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const page=await context.newPage();
 const base=process.env.BASE_URL||'http://127.0.0.1:8767/web/';
 const root=new URL(base).origin;
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 // Real OS install UI cannot be automated in headless Chromium. Test its event
 // contract explicitly, while checking the actual manifest and service worker.
 await page.addInitScript(()=>window.addEventListener('beforeinstallprompt',e=>{if(e.isTrusted)e.stopImmediatePropagation()},true));
 await page.route(root+'/previous.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Previous site</title>Previous site'}));
 const waitScreen=screen=>page.waitForFunction(s=>document.getElementById('canvas').dataset.screen===s,screen);
 const gameClick=async(x,y)=>{
  const b=await page.locator('canvas').boundingBox(),s=Math.min(b.width/480,b.height/900);
  await page.mouse.click(b.x+(b.width-480*s)/2+x*s,b.y+(b.height-900*s)/2+y*s);
 };
 const back=async()=>{await page.evaluate(()=>history.back());await page.waitForTimeout(150);assert.equal(page.url(),base)};
 try{
  await page.goto(root+'/previous.html');
  await page.evaluate(()=>caches.open('other-project').then(cache=>cache.put('/other',new Response('keep me'))));
  await page.goto(base);
  await page.locator('#loading').waitFor({state:'detached',timeout:60000});
  await waitScreen('menu');
  let historyLength=await page.evaluate(()=>history.length);
  // Load a real reference SNG and start playing so the audio clock can be checked.
  await page.locator('#track-picker').setInputFiles(path.join(__dirname,'fixtures/reference-chart.sng'));
  await page.waitForFunction(()=>document.getElementById('canvas').dataset.mode==='sng');
  await gameClick(240,635);await waitScreen('playing');
  historyLength=await page.evaluate(()=>history.length);
  assert.equal(await page.evaluate(()=>history.state.fivefold),'guard');
  await page.waitForFunction(()=>window.fivefoldSngTime()>.3);
  await back();await waitScreen('paused');
  const clock=await page.evaluate(()=>window.fivefoldSngTime());
  for(let i=0;i<3;i++){await back();await waitScreen('paused')}
  assert(Math.abs((await page.evaluate(()=>window.fivefoldSngTime()))-clock)<.01,'Back freezes audio');
  assert.equal(await page.evaluate(()=>history.length),historyLength,'No history growth from repeated Back');
  fs.mkdirSync('test-results',{recursive:true});
  await page.screenshot({path:'test-results/back-pause.png'});
  await gameClick(240,400);await waitScreen('playing');
  await page.waitForFunction(t=>window.fivefoldSngTime()>t+.1,clock);
  await back();await waitScreen('paused');
  await gameClick(240,543);await waitScreen('menu');
  await back();await waitScreen('back_prompt');
  await back();await waitScreen('back_prompt');
  await page.screenshot({path:'test-results/back-menu.png'});
  await gameClick(240,475);await waitScreen('menu');
  await gameClick(120,792);await waitScreen('settings');
  await page.locator('#install-app').waitFor({state:'visible'});
  await page.locator('#fullscreen-app').waitFor({state:'visible'});
  await page.locator('#fullscreen-app').click();
  await page.waitForFunction(()=>document.fullscreenElement===document.documentElement);
  await page.waitForFunction(()=>document.getElementById('fullscreen-app').getAttribute('aria-label')==='EXIT FULLSCREEN');
  assert.equal(await page.evaluate(()=>window.fivefoldInstallLabel()),'INSTALL APP','Browser fullscreen is not mistaken for an installed app');
  await page.screenshot({path:'test-results/fullscreen-settings.png'});
  await page.locator('#fullscreen-app').click();
  await page.waitForFunction(()=>!document.fullscreenElement);
  await page.waitForFunction(()=>document.getElementById('fullscreen-app').getAttribute('aria-label')==='FULLSCREEN');

  await page.screenshot({path:'test-results/install-settings.png'});
  await page.locator('#install-app').click();
  await page.locator('#install-dialog[open]').waitFor();
  assert((await page.locator('#install-message').textContent()).includes('브라우저 메뉴'));
  await page.screenshot({path:'test-results/install-help.png'});
  await back();
  assert.equal(await page.locator('#install-dialog').evaluate(d=>d.open),false);
  await waitScreen('settings');
  // Simulated browser install event is triggered by a real button click.
  await page.evaluate(()=>{
   window.installCalls=0;
   const event=new Event('beforeinstallprompt',{cancelable:true});
   event.prompt=()=>{window.installCalls++;return Promise.resolve()};
   event.userChoice=Promise.resolve({outcome:'accepted'});
   window.dispatchEvent(event);
  });
  await page.locator('#install-app').click();
  assert.equal(await page.evaluate(()=>window.installCalls),1);
  await page.evaluate(()=>window.dispatchEvent(new Event('appinstalled')));
  await page.waitForFunction(()=>document.getElementById('install-app').getAttribute('aria-label')==='APP INSTALLED');
  await back();await waitScreen('menu');
  // Verify the actual manifest and scoped worker, then boot entirely offline.
  await page.waitForFunction(()=>document.getElementById('canvas').dataset.offlineReady==='true' && navigator.serviceWorker.controller,null,{timeout:60000});
  const manifest=await page.evaluate(async()=>await(await fetch('manifest.webmanifest')).json());
  assert.equal(manifest.display,'fullscreen');assert.equal(manifest.scope,'./');
  assert(manifest.icons.some(i=>i.sizes==='192x192'));
  assert(manifest.icons.some(i=>i.sizes==='512x512'));
  assert((await page.evaluate(()=>caches.keys())).includes('other-project'),'Other apps caches survive');
  const client=await context.newCDPSession(page);
  const installability=await client.send('Page.getInstallabilityErrors');
  console.log('Chromium installability:',JSON.stringify(installability));
  assert.equal(installability.installabilityErrors.length,0);
  await context.setOffline(true);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#loading').waitFor({state:'detached',timeout:60000});
  await waitScreen('menu');
  assert.equal(await page.evaluate(()=>history.length),historyLength,'Reload reuses the existing history guard');
  // Back during a slow final stem cancels import without leaving a stuck loader.
  await page.evaluate(()=>{
   window.originalDecode=OfflineAudioContext.prototype.decodeAudioData;
   OfflineAudioContext.prototype.decodeAudioData=function(...args){const self=this;return new Promise((resolve,reject)=>setTimeout(()=>window.originalDecode.apply(self,args).then(resolve,reject),500))};
  });
  const chooser=page.waitForEvent('filechooser');
  await page.locator('#local-import').click();
  await (await chooser).setFiles(path.join(__dirname,'fixtures/reference-chart.sng'));
  await page.waitForFunction(()=>!document.getElementById('import-status').hidden);
  await back();await waitScreen('back_prompt');
  await page.waitForTimeout(800);
  assert.equal(await page.locator('#import-status').evaluate(s=>s.hidden),true,'Cancelled decoder cannot re-open loader');
  await page.evaluate(()=>{OfflineAudioContext.prototype.decodeAudioData=window.originalDecode;delete window.originalDecode});
  await gameClick(240,475);await waitScreen('menu');

  await page.locator('#track-picker').setInputFiles(path.join(__dirname,'fixtures/reference-midi.sng'));
  await page.waitForFunction(()=>document.getElementById('canvas').dataset.mode==='sng');
  await gameClick(240,635);await waitScreen('playing');
  await page.waitForFunction(()=>window.fivefoldSngTime()>.2);
  await back();await waitScreen('paused');
  await page.screenshot({path:'test-results/offline-pause.png'});
  await gameClick(240,543);await waitScreen('menu');
  await gameClick(120,792);await waitScreen('settings');
  // Exercise the iPhone instruction branch; this is not a real Safari install test.
  await page.evaluate(()=>Object.defineProperty(navigator,'userAgent',{value:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/605.1.15',configurable:true}));
  await page.locator('#install-app').click();
  await page.locator('#install-dialog[open]').waitFor();
  assert((await page.locator('#install-message').textContent()).includes('공유 버튼'));
  await page.screenshot({path:'test-results/install-iphone-help.png'});
  await page.locator('#install-close').click();
  // API fullscreen loss (Android Back/Escape) also pauses active gameplay.
  await page.locator('#fullscreen-app').click();
  await page.waitForFunction(()=>document.fullscreenElement);
  await gameClick(240,786);await waitScreen('menu');
  await gameClick(240,635);await waitScreen('playing');
  await page.waitForFunction(()=>window.fivefoldSngTime()>.2);
  await page.evaluate(()=>document.exitFullscreen());
  await waitScreen('paused');
  const fullscreenClock=await page.evaluate(()=>window.fivefoldSngTime());
  await page.waitForTimeout(200);
  assert(Math.abs((await page.evaluate(()=>window.fivefoldSngTime()))-fullscreenClock)<.01,'Exiting fullscreen pauses audio');
  await page.screenshot({path:'test-results/fullscreen-exit-pause.png'});

  // Manifest fullscreen has no document.fullscreenElement: emulate that launch
  // context to verify the installed/fullscreen labels independently of the API.
  const installedPage=await context.newPage();
  await installedPage.addInitScript(()=>{
   const match=window.matchMedia.bind(window);
   window.matchMedia=query=>{const result=match(query);if(query==='(display-mode: fullscreen)')Object.defineProperty(result,'matches',{value:true});return result};
  });
  await installedPage.goto(base);
  await installedPage.locator('#loading').waitFor({state:'detached',timeout:60000});
  assert.equal(await installedPage.evaluate(()=>document.fullscreenElement),null);
  assert.equal(await installedPage.evaluate(()=>window.fivefoldInstallLabel()),'APP INSTALLED');
  assert.equal(await installedPage.evaluate(()=>window.fivefoldFullscreenLabel()),'FULLSCREEN ON');
  await installedPage.close();
  assert.deepEqual(errors,[]);
  console.log('App checks passed: repeated Back, in-app dialogs, frozen/resumed audio, settings navigation, fullscreen enter/exit and pause, install button/prompt/help, fullscreen app manifest, scoped offline PWA boot and SNG playback.');
 }finally{await context.close();fs.rmSync(profile,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exit(1)});
