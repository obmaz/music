import {placeOverlay} from './app.mjs';
import {parsePackage} from './sng.mjs';

let pending = '', active = null, loadId = 0, screen = 'menu';
let context = null, source = null, startedAt = 0, position = 0, playing = false;
const picker = document.getElementById('track-picker');
const importButton = document.getElementById('local-import');
const status = document.getElementById('import-status');
const statusText = document.getElementById('import-message');
const canvas = document.getElementById('canvas');

function getContext() {
  if (!context) context = new (window.AudioContext || window.webkitAudioContext)({latencyHint:'interactive'});
  return context;
}
function stopSource() {
  if (source) { source.onended = null; source.stop(); source.disconnect(); source = null; }
  playing = false;
}
function readTime() {
  if (!active) return 0;
  if (!playing) return position;
  return Math.max(0, Math.min(active.duration, context.currentTime - startedAt - (context.outputLatency || 0)));
}
window.fivefoldSngTime = readTime;
window.fivefoldSngAudio = action => {
  if (action === 'unload') { stopSource(); position = 0; active = null; return; }
  if (action === 'stop') { stopSource(); position = 0; return; }
  if (!active) return;
  if (action === 'pause') {
    position = Math.min(active.duration, playing ? context.currentTime - startedAt : position);
    stopSource(); return;
  }
  if (action === 'start') { stopSource(); position = 0; }
  if (action === 'start' || action === 'resume') {
    if (playing || position >= active.duration) return;
    getContext().resume().catch(() => {});
    source = context.createBufferSource();
    source.buffer = active.buffer;
    source.connect(context.destination);
    startedAt = context.currentTime + .03 - position;
    source.onended = () => { position = active.duration; playing = false; source = null; };
    source.start(context.currentTime + .03, position);
    playing = true;
  }
};
// Audio activation must happen inside an actual touch/click gesture on Safari.
window.addEventListener('pointerdown', () => { if (context?.state === 'suspended') context.resume().catch(() => {}); }, true);
window.fivefoldReport = report => {
  for (const [key, value] of Object.entries(report)) canvas.dataset[key] = String(value);
  canvas.setAttribute('aria-label', `FIVEFOLD: ${report.title}. Score ${report.score}. ${report.combo} combo. Five lanes: D F Space J K. Escape pauses.`);
};
window.fivefoldTakeTrack = () => { const value = pending; pending = ''; return value; };
window.fivefoldPickTrack = () => { picker.value = ''; picker.click(); };
window.fivefoldSetScreen = value => {
  screen = value;
  window.fivefoldAppScreen(value);
  canvas.dataset.screen = value;
  importButton.hidden = value !== 'menu';
  placeImportButton();
};
function placeImportButton() {
  placeOverlay(importButton, 24, 682, 432, 46);
}
new ResizeObserver(placeImportButton).observe(canvas);
importButton.addEventListener('click', window.fivefoldPickTrack);
window.addEventListener('resize', placeImportButton);

window.fivefoldCancelImport = () => { if (!status.hidden) { loadId++; status.hidden = true; } };

function showProgress(message) { status.hidden = false; statusText.textContent = message; }
const nextFrame = () => new Promise(resolve => setTimeout(resolve, 0));
async function decodeSong(parsed, id) {
  // Decode/resample one stem at a time and mix into one 24 kHz stereo buffer.
  // Keeping all uncompressed stems at device rate would exhaust mobile memory.
  const decoder = new OfflineAudioContext(2, 1, 24000);
  let mix = null;
  const decodeContext = getContext();
  for (let index = 0; index < parsed.audioPaths.length; index++) {
    if (id !== loadId) throw new Error('Import cancelled.');
    const name = parsed.audioPaths[index];
    showProgress(`Decoding audio ${index+1}/${parsed.audioPaths.length}…`);
    await nextFrame();
    if (id !== loadId) throw new Error('Import cancelled.');
    let decoded;
    try { decoded = await decoder.decodeAudioData(parsed.pkg.read(name).buffer); }
    catch { throw new Error(`Browser cannot decode ${name.split('/').at(-1)}. Try a current Chrome/Firefox or another SNG.`); }
    if (id !== loadId) throw new Error('Import cancelled.');
    if (decoded.duration > 600) throw new Error('This song is longer than the 10-minute mobile limit.');
    if (!mix || mix.length < decoded.length) {
      const larger = decodeContext.createBuffer(2, decoded.length, 24000);
      if (mix) for (let ch=0; ch<2; ch++) larger.getChannelData(ch).set(mix.getChannelData(ch));
      mix = larger;
    }
    for (let ch=0; ch<2; ch++) {
      const input = decoded.getChannelData(Math.min(ch, decoded.numberOfChannels-1));
      const output = mix.getChannelData(ch);
      for (let i=0; i<input.length; i++) output[i] += input[i];
    }
    decoded = null;
  }
  if (!mix || mix.duration < 1) throw new Error('SNG audio is empty or too short.');
  showProgress('Preparing your session…');
  await nextFrame();
  let peak = 0;
  for (let ch=0; ch<2; ch++) for (const sample of mix.getChannelData(ch)) peak = Math.max(peak, Math.abs(sample));
  if (peak > .95) for (let ch=0; ch<2; ch++) {
    const channel = mix.getChannelData(ch), gain = .95 / peak;
    for (let i=0; i<channel.length; i++) channel[i] *= gain;
  }
  const parts = parsed.chart.parts;
  for (const part of parts) for (const [difficulty, notes] of Object.entries(part.charts)) {
    const usable = notes.filter(n => n.time < mix.duration);
    for (const n of usable) n.hold = Math.min(n.hold, mix.duration - n.time);
    if (usable.length) part.charts[difficulty] = usable;
    else delete part.charts[difficulty];
  }
  const playableParts = parts.filter(part => Object.keys(part.charts).length);
  if (!playableParts.length) throw new Error('Chart has no notes within the audio duration.');
  return {
    buffer: mix, duration: mix.duration,
    payload: {type:'sng', name:parsed.title, artist:parsed.artist, charter:parsed.charter,
      bpm:parsed.chart.bpm, duration:mix.duration, parts:playableParts,
      format:parsed.chart.format, open_notes:parsed.chart.openNotes,
      stem_count:parsed.audioPaths.length},
  };
}

picker.addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  const id = ++loadId;
  const ext = file.name.split('.').pop().toLowerCase();
  try {
    if (!['sng','mp3','ogg','wav'].includes(ext)) throw new Error('Choose an SNG, MP3, OGG or WAV file.');
    if (file.size > (ext === 'sng' ? 128 : 40)*1024*1024) throw new Error(ext === 'sng' ? 'SNG is too large (128 MB maximum).' : 'Audio is too large (40 MB maximum).');
    showProgress(ext === 'sng' ? 'Reading SNG package…' : 'Reading local audio…');
    await nextFrame();
    if (ext === 'sng') {
      const parsed = parsePackage(await file.arrayBuffer());
      const prepared = await decodeSong(parsed, id);
      if (id !== loadId) return;
      stopSource(); position = 0; active = prepared;
      pending = JSON.stringify(prepared.payload);
      canvas.dataset.import = 'sng';
      canvas.dataset.track = prepared.payload.name;
      canvas.dataset.notes = String(Object.values(prepared.payload.parts[0].charts).flat().length);
    } else {
      const data = await new Promise((resolve,reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      if (id !== loadId) return;
      pending = JSON.stringify({name:file.name, ext, data});
      canvas.dataset.import = 'audio';
    }
    canvas.focus();
  } catch(error) {
    if (id !== loadId) return;
    pending = JSON.stringify({error:error.message || 'Could not load this file.'});
    canvas.dataset.importError = error.message;
    canvas.focus();
  } finally { if (id === loadId) status.hidden = true; }
});
// No requests are made for local packages: all extraction, chart parsing and audio decoding are on-device.
