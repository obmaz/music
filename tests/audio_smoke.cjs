// Monitor real Web Audio output, including Godot's sample playback path.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:480,height:900},hasTouch:true,isMobile:true});
 const errors=[];
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});
 page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error(m.text())}});
 await page.addInitScript(()=>{
  window.audioMonitors=[];
  const monitors=new WeakMap(),connect=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(destination,...args){
   const result=connect.call(this,destination,...args);
   if(destination===this.context.destination && !(this instanceof AnalyserNode)){
    let analyser=monitors.get(this.context);
    if(!analyser){analyser=this.context.createAnalyser();analyser.fftSize=2048;monitors.set(this.context,analyser);window.audioMonitors.push({context:this.context,analyser})}
    // Observe a parallel branch; do not alter the actual destination routing.
    connect.call(this,analyser);
   }
   return result;
  };
  window.captureAudio=(milliseconds,engineOnly=false)=>{
   window.audioCapture=new Promise(resolve=>{
    let peak=0;const end=performance.now()+milliseconds;
    const sample=()=>{
     for(const monitor of window.audioMonitors){
      if(engineOnly && !window.engineContexts.includes(monitor.context))continue;
      const data=new Float32Array(monitor.analyser.fftSize);
      monitor.analyser.getFloatTimeDomainData(data);
      for(const value of data)peak=Math.max(peak,Math.abs(value));
     }
     if(performance.now()>=end)resolve(peak);else setTimeout(sample,5);
    };sample();
   });
  };
 });
 const waitScreen=screen=>page.waitForFunction(s=>document.querySelector('canvas').dataset.screen===s,screen);
 const capture=async(duration,only=false)=>page.evaluate(([ms,only])=>{window.captureAudio(ms,only)},[duration,only]);
 try{
  await page.goto(process.env.BASE_URL||'http://127.0.0.1:8766');
  await page.locator('#loading').waitFor({state:'detached',timeout:60000});
  await waitScreen('menu');
  await page.mouse.click(240,635);await waitScreen('playing');
  // During the two-second count-in there is no background music: any signal
  // here must be the pressed key's dry feedback sound.
  await capture(220);
  await page.keyboard.down('d');
  const dry=await page.evaluate(()=>window.audioCapture);
  assert(dry>.001,`Dry tap was silent: ${dry}`);
  await page.waitForTimeout(100);
  await capture(150);
  await page.keyboard.down('d'); // Repeated held key must not retrigger.
  const repeated=await page.evaluate(()=>window.audioCapture);
  assert(repeated<.0001,`Held key retriggered feedback: ${repeated}`);
  await page.keyboard.up('d');
  await page.keyboard.press('Escape');await waitScreen('paused');
  await page.mouse.click(240,543);await waitScreen('menu');
  await page.evaluate(()=>{window.engineContexts=window.audioMonitors.map(m=>m.context)});
  await page.locator('#track-picker').setInputFiles(path.join(__dirname,'fixtures/reference-chart.sng'));
  await page.waitForFunction(()=>document.querySelector('canvas').dataset.mode==='sng');
  await page.mouse.click(240,635);await waitScreen('playing');
  await page.waitForFunction(()=>window.fivefoldSngTime()>=.84,null,{polling:'raf'});
  // SNG music runs on another context, so measure the Godot feedback context
  // separately to prove that a scored note produces its own sound.
  await capture(220,true);
  await page.keyboard.press('d');
  const hit=await page.evaluate(()=>window.audioCapture);
  assert(hit>.001,`Scored note feedback was silent: ${hit}`);
  assert(Number(await page.locator('canvas').getAttribute('data-score'))>0);
  await page.keyboard.press('Escape');await waitScreen('paused');
  await page.waitForTimeout(150);
  await capture(100);
  const paused=await page.evaluate(()=>window.audioCapture);
  assert(paused<.0001,`Pause did not silence audio: ${paused}`);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({dryTapPeak:dry,heldKeyPeak:repeated,scoredHitPeak:hit,pausedPeak:paused}));
  console.log('Audio output checks passed: dry tap, scored hit, no repeat on hold, pause silences effects and music.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
