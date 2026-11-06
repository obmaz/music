// SNG v1: https://github.com/mdsitton/SngFileFormat (little endian).
// Chart timing: FireFox's Chart File Format Specifications; MIDI SMF 0/1 (PPQN).
// Original implementation; no third-party parser code or song assets are bundled.
const utf8 = new TextDecoder('utf-8', {fatal: true});
const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Expert'];
const PARTS = [
  ['guitar', 'GUITAR', 'Single', 'PART GUITAR'],
  ['bass', 'BASS', 'DoubleBass', 'PART BASS'],
  ['rhythm', 'RHYTHM', 'DoubleRhythm', 'PART RHYTHM'],
  ['coop', 'CO-OP', 'DoubleGuitar', 'PART GUITAR COOP'],
  ['keys', 'KEYS', 'Keyboard', 'PART KEYS'],
];
const fail = message => { throw new Error(message); };
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
export const cleanText = value => String(value ?? '').replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f]/g, ' ').trim();

class Reader {
  constructor(bytes, little = true) {
    this.bytes = bytes instanceof Uint8Array ? new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength) : new Uint8Array(bytes);
    this.view = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength);
    this.pos = 0; this.little = little;
  }
  need(n) { if (!Number.isSafeInteger(n) || n < 0 || this.pos + n > this.bytes.length) fail('Truncated or invalid song file.'); }
  take(n) { this.need(n); const result = this.bytes.subarray(this.pos, this.pos + n); this.pos += n; return result; }
  u8() { this.need(1); return this.view.getUint8(this.pos++); }
  u16() { this.need(2); const v = this.view.getUint16(this.pos, this.little); this.pos += 2; return v; }
  u32() { this.need(4); const v = this.view.getUint32(this.pos, this.little); this.pos += 4; return v; }
  u64() { this.need(8); const v = this.view.getBigUint64(this.pos, this.little); this.pos += 8; if (v > BigInt(Number.MAX_SAFE_INTEGER)) fail('SNG offset is too large.'); return Number(v); }
  text(n) { return utf8.decode(this.take(n)); }
  vlq() {
    let n = 0;
    for (let i = 0; i < 4; i++) { const b = this.u8(); n = n * 128 + (b & 127); if (!(b & 128)) return n; }
    fail('Invalid MIDI variable-length number.');
  }
}

export function readSng(buffer) {
  const r = new Reader(buffer);
  if (r.text(6) !== 'SNGPKG') fail('This is not a Clone Hero SNG package (SNGPKG).');
  if (r.u32() !== 1) fail('Unsupported SNG version. Export a current SNG v1 package.');
  const mask = r.take(16);
  const metadataEnd = r.u64() + r.pos;
  if (metadataEnd > r.bytes.length) fail('Invalid SNG metadata section.');
  const count = r.u64();
  if (count > 10000) fail('Too many SNG metadata entries.');
  const metadata = Object.create(null);
  for (let i = 0; i < count; i++) {
    const key = r.text(r.u32()).toLowerCase();
    metadata[key] = r.text(r.u32());
    if (r.pos > metadataEnd) fail('SNG metadata extends beyond its section.');
  }
  if (r.pos !== metadataEnd) fail('Invalid SNG metadata length.');
  const indexEnd = r.u64() + r.pos;
  if (indexEnd > r.bytes.length) fail('Invalid SNG file index.');
  const fileCount = r.u64();
  if (fileCount > 2048) fail('Too many files in SNG package.');
  const entries = new Map();
  for (let i = 0; i < fileCount; i++) {
    const name = r.text(r.u8()).replaceAll('\\', '/').toLowerCase();
    const size = r.u64(), offset = r.u64();
    if (!name || entries.has(name)) fail('Duplicate or empty SNG filename.');
    entries.set(name, {name, size, offset});
    if (r.pos > indexEnd) fail('SNG index extends beyond its section.');
  }
  if (r.pos !== indexEnd) fail('Invalid SNG index length.');
  const dataSize = r.u64(), dataStart = r.pos;
  if (dataSize !== r.bytes.length - dataStart) fail('Invalid SNG data section length.');
  const ranges = [...entries.values()].sort((a, b) => a.offset - b.offset);
  let previousEnd = dataStart;
  for (const entry of ranges) {
    if (entry.offset < previousEnd || entry.offset + entry.size > r.bytes.length) fail('Invalid or overlapping SNG file range.');
    previousEnd = entry.offset + entry.size;
  }
  return {
    metadata, entries,
    read(name) {
      const entry = entries.get(name);
      if (!entry) fail(`Missing package file: ${name}`);
      const decoded = r.bytes.slice(entry.offset, entry.offset + entry.size);
      for (let i = 0; i < decoded.length; i++) decoded[i] ^= mask[i & 15] ^ (i & 255);
      return decoded;
    },
  };
}

export function tempoMap(resolution, tempos, defaultMicros = 500000) {
  if (!Number.isInteger(resolution) || resolution <= 0 || resolution > 32767) fail('Invalid chart resolution.');
  const sorted = [{tick: 0, micros: defaultMicros}, ...tempos].sort((a, b) => a.tick - b.tick);
  const points = [];
  for (const t of sorted) {
    if (!Number.isSafeInteger(t.tick) || t.tick < 0 || !(t.micros > 0) || !Number.isFinite(t.micros)) fail('Invalid chart tempo event.');
    if (points.length && points.at(-1).tick === t.tick) points[points.length - 1] = {...t};
    else points.push({...t});
  }
  let seconds = 0;
  for (let i = 0; i < points.length; i++) {
    if (i) seconds += (points[i].tick - points[i-1].tick) * points[i-1].micros / resolution / 1e6;
    points[i].seconds = seconds;
  }
  return {
    bpm: 60e6 / points[0].micros,
    seconds(tick) {
      let low = 0, high = points.length - 1;
      while (low < high) { const mid = Math.ceil((low + high) / 2); if (points[mid].tick <= tick) low = mid; else high = mid - 1; }
      const p = points[low];
      return p.seconds + (tick - p.tick) * p.micros / resolution / 1e6;
    },
  };
}

function normalize(raw, timing, offset) {
  if (raw.length > 200000) fail('Chart has too many notes.');
  raw.sort((a, b) => a.tick - b.tick || a.lane - b.lane);
  const notes = [], seen = new Map();
  for (const n of raw) {
    const start = timing.seconds(n.tick) + offset;
    const end = timing.seconds(n.tick + n.length) + offset;
    if (end < 0) continue;
    const time = Math.max(0, start), hold = Math.max(0, end - time);
    const key = `${n.tick}:${n.lane}`;
    if (seen.has(key)) { seen.get(key).hold = Math.max(seen.get(key).hold, hold); continue; }
    const note = {time, lane: n.lane, hold: hold < .08 ? 0 : hold};
    seen.set(key, note); notes.push(note);
  }
  // Same-lane re-triggers must be possible with a touch button.
  const next = [Infinity, Infinity, Infinity, Infinity, Infinity];
  for (let i = notes.length - 1; i >= 0; i--) {
    const n = notes[i]; n.hold = Math.min(n.hold, Math.max(0, next[n.lane] - n.time - .02));
    if (n.hold < .08) n.hold = 0;
    next[n.lane] = n.time;
  }
  return notes;
}

export function parseChart(source, metadata = {}) {
  const sections = new Map();
  let current = '';
  for (const line of source.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const section = line.match(/^\s*\[([^\]]+)\]\s*$/);
    if (section) { current = section[1]; sections.set(current, []); }
    else if (current) sections.get(current).push(line.trim());
  }
  const song = Object.create(null);
  for (const line of sections.get('Song') || []) {
    const m = line.match(/^(\w+)\s*=\s*(.*?)\s*$/);
    if (m) song[m[1].toLowerCase()] = m[2].replace(/^"|"$/g, '');
  }
  const resolution = finite(song.resolution, 192);
  const tempos = [];
  for (const line of sections.get('SyncTrack') || []) {
    const m = line.match(/^(\d+)\s*=\s*B\s+(\d+)/);
    if (m) tempos.push({tick: Number(m[1]), micros: 60e9 / Number(m[2])});
  }
  const timing = tempoMap(resolution, tempos);
  const offset = finite(song.offset) + finite(metadata.delay) / 1000;
  const parts = [];
  let openNotes = 0;
  for (const [id, label, suffix] of PARTS) {
    const charts = {};
    for (let d = 0; d < 4; d++) {
      const raw = [];
      for (const line of sections.get(DIFFICULTIES[d] + suffix) || []) {
        const m = line.match(/^(\d+)\s*=\s*N\s+(\d+)\s+(\d+)/);
        if (!m) continue;
        let lane = Number(m[2]);
        if (lane === 7) { lane = 2; openNotes++; }
        if (lane > 4) continue; // Tap/forced flags are modifiers, not notes.
        raw.push({tick: Number(m[1]), lane, length: Number(m[3])});
      }
      const notes = normalize(raw, timing, offset);
      if (notes.length) charts[d] = notes;
    }
    if (Object.keys(charts).length) parts.push({id, label, charts});
  }
  return {parts, bpm: timing.bpm, metadata: song, openNotes, format: 'chart'};
}

export function parseMidi(bytes, metadata = {}) {
  const r = new Reader(bytes, false);
  if (r.text(4) !== 'MThd') fail('Invalid MIDI header.');
  const headerLength = r.u32(), headerEnd = r.pos + headerLength;
  if (headerLength < 6) fail('Invalid MIDI header length.');
  const format = r.u16(), trackCount = r.u16(), resolution = r.u16();
  if (format > 1 || (resolution & 0x8000)) fail('Only PPQN MIDI format 0/1 is supported.');
  if (trackCount > 256) fail('Too many MIDI tracks.');
  r.need(headerEnd - r.pos); r.pos = headerEnd;
  const tempos = [], tracks = [];
  for (let ti = 0; ti < trackCount; ti++) {
    if (r.text(4) !== 'MTrk') fail('Invalid MIDI track header.');
    const track = new Reader(r.take(r.u32()), false);
    let tick = 0, running = 0, name = '', events = 0;
    const active = new Map(), raw = [];
    while (track.pos < track.bytes.length) {
      if (++events > 1000000) fail('Too many MIDI events.');
      tick += track.vlq();
      let status = track.u8();
      if (status < 0x80) { if (!running) fail('Invalid MIDI running status.'); track.pos--; status = running; }
      if (status === 0xff) {
        const type = track.u8(), data = track.take(track.vlq());
        if (type === 3) name = new TextDecoder().decode(data).trim().toUpperCase();
        if (type === 0x51 && data.length === 3) tempos.push({tick, micros: data[0]*65536 + data[1]*256 + data[2]});
        if (type === 0x2f) break;
        continue;
      }
      if (status === 0xf0 || status === 0xf7) { track.take(track.vlq()); running = 0; continue; }
      if (status >= 0xf0) fail('Unsupported MIDI system event.');
      running = status;
      const type = status >> 4, channel = status & 15;
      const pitch = track.u8(), velocity = type === 0xc || type === 0xd ? 0 : track.u8();
      if (pitch > 127 || velocity > 127) fail('Invalid MIDI channel event.');
      const key = `${channel}:${pitch}`;
      if (type === 9 && velocity > 0) {
        if (!active.has(key)) active.set(key, []);
        active.get(key).push(tick);
      } else if ((type === 8 || type === 9) && active.get(key)?.length) {
        const start = active.get(key).shift();
        raw.push({tick: start, pitch, length: tick - start});
      }
    }
    tracks.push({name, raw});
  }
  const timing = tempoMap(resolution, tempos);
  const parts = [];
  let openNotes = 0;
  for (const [id, label, , midiName] of PARTS) {
    const matches = tracks.filter(t => t.name === midiName || (format === 0 && id === 'guitar' && !t.name));
    const charts = {};
    for (let d = 0; d < 4; d++) {
      const raw = [];
      for (const track of matches) for (const n of track.raw) {
        const base = 60 + d * 12;
        let lane = n.pitch - base;
        if (lane === -1) { lane = 2; openNotes++; }
        if (lane >= 0 && lane <= 4) raw.push({...n, lane});
      }
      const notes = normalize(raw, timing, finite(metadata.delay) / 1000);
      if (notes.length) charts[d] = notes;
    }
    if (Object.keys(charts).length) parts.push({id, label, charts});
  }
  return {parts, bpm: timing.bpm, metadata: {}, openNotes, format: 'mid'};
}

export function parsePackage(buffer) {
  const pkg = readSng(buffer);
  const byBase = new Map([...pkg.entries.keys()].map(name => [name.split('/').at(-1), name]));
  const metadata = Object.assign(Object.create(null), pkg.metadata);
  const iniPath = byBase.get('song.ini');
  if (iniPath) {
    for (const line of utf8.decode(pkg.read(iniPath)).split(/\r?\n/)) {
      const m = line.match(/^\s*([\w]+)\s*=\s*(.*?)\s*$/);
      if (m && !Object.hasOwn(metadata, m[1].toLowerCase())) metadata[m[1].toLowerCase()] = m[2];
    }
  }
  const chartPath = byBase.get('notes.chart'), midiPath = byBase.get('notes.mid');
  if (!chartPath && !midiPath) fail('SNG contains no notes.chart or notes.mid.');
  const chart = chartPath ? parseChart(utf8.decode(pkg.read(chartPath)), metadata) : parseMidi(pkg.read(midiPath), metadata);
  if (!chart.parts.length) fail('No 5-fret guitar/bass/keys chart found. Drums and 6-fret charts are not supported.');
  const audioPaths = [...pkg.entries.keys()].filter(name => /\.(ogg|opus|mp3|wav|flac)$/i.test(name) && !/^(preview|crowd)\./i.test(name.split('/').at(-1)));
  if (!audioPaths.length) fail('SNG contains no playable audio.');
  return {
    pkg, chart, audioPaths,
    title: cleanText(metadata.name || chart.metadata.name || 'LOCAL SNG'),
    artist: cleanText(metadata.artist || chart.metadata.artist || 'UNKNOWN ARTIST'),
    charter: cleanText(metadata.charter || metadata.frets || chart.metadata.charter || ''),
  };
}
