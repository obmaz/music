import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readSng, parsePackage, parseChart, parseMidi, tempoMap, cleanText} from '../web/sng.mjs';
const fixture = name => readFileSync(new URL(`./fixtures/${name}`, import.meta.url));
const close = (a,b) => assert(Math.abs(a-b)<1e-9, `${a} != ${b}`);

test('official SngCli v0.3.0 package: metadata, masked chart/audio, real difficulties', () => {
 const parsed=parsePackage(fixture('reference-chart.sng'));
 assert.equal(parsed.title,'SNG REFERENCE CHART');
 assert.equal(parsed.artist,'FIVEFOLD TEST');
 assert.equal(new TextDecoder().decode(parsed.pkg.read('song.ogg').subarray(0,4)),'OggS');
 assert.equal(parsed.chart.parts.length,2);
 assert.deepEqual(Object.keys(parsed.chart.parts[0].charts),['0','3']);
 assert.equal(parsed.chart.parts[0].charts[3].length,9); // N 5 is a flag, N 7 is a center-lane note.
 assert.equal(parsed.chart.openNotes,1);
 const notes=parsed.chart.parts[0].charts[3];
 close(notes[0].time,.85); // 0.5s beat + 0.25s chart offset + 100ms INI delay.
 assert.deepEqual(notes.slice(0,2).map(n=>n.lane),[0,4]);
 close(notes[2].hold,1.25); // Hold crosses the 120 -> 60 BPM change.
 close(notes.at(-1).time,4.35);
});

test('official MIDI + Opus + OGG stem package, PPQN tempo map and difficulty', () => {
 const p=parsePackage(fixture('reference-midi.sng'));
 assert.equal(p.chart.format,'mid');
 assert.deepEqual(p.audioPaths,['song.opus','guitar.ogg']);
 assert.deepEqual(Object.keys(p.chart.parts[0].charts),['3']);
 const notes=p.chart.parts[0].charts[3];
 assert.equal(notes.length,9);
 close(notes[0].time,.6);
 close(notes[2].hold,1.25);
 close(notes.at(-1).time,4.1);
});

test('tempo changes, defaults, same-tick changes and invalid tempos', () => {
 const map=tempoMap(192,[{tick:192,micros:1000000},{tick:192,micros:250000}]);
 close(map.seconds(192),.5); close(map.seconds(384),.75);
 assert.throws(()=>tempoMap(0,[]));
 assert.throws(()=>tempoMap(192,[{tick:0,micros:0}]));
});

test('chart note flags ignored; duplicate/open and retriggered sustains are playable', () => {
 const source='[Song]\n{\nResolution=192\n}\n[ExpertSingle]\n{\n0 = N 2 384\n0 = N 7 0\n0 = N 5 0\n0 = N 6 0\n192 = N 2 0\n}\n';
 const p=parseChart(source);
 assert.equal(p.parts[0].charts[3].length,2);
 close(p.parts[0].charts[3][0].hold,.48);
});

test('drum/6-fret charts are not incorrectly interpreted as 5-fret guitar', () => {
 assert.equal(parseChart('[ExpertDrums]\n{\n0 = N 0 0\n}\n[ExpertGHLGuitar]\n{\n0 = N 0 0\n}').parts.length,0);
});

test('truncated/invalid containers, versions, indexes and UTF-8 fail clearly', () => {
 const bytes=fixture('reference-chart.sng');
 for(const end of [0,6,12,26,40,100,bytes.length-1]) assert.throws(()=>readSng(bytes.subarray(0,end)));
 const version=Buffer.from(bytes); version.writeUInt32LE(99,6); assert.throws(()=>readSng(version),/version/);
 const bad=Buffer.from(bytes); bad[0]=0; assert.throws(()=>readSng(bad),/SNGPKG/);
 const huge=Buffer.from(bytes); huge.writeBigUInt64LE(2n**63n,26); assert.throws(()=>readSng(huge),/large/);
});

test('MIDI running status, note-on velocity zero, default tempo', () => {
 const header=Buffer.from('4d546864000000060000000100c0','hex');
 const events=Buffer.from([0,255,3,11,...Buffer.from('PART GUITAR'), 0,0x90,96,100, 0x81,0x40,96,0, 0,255,47,0]);
 const len=Buffer.alloc(4); len.writeUInt32BE(events.length);
 const midi=Buffer.concat([header,Buffer.from('MTrk'),len,events]);
 const p=parseMidi(midi);
 assert.equal(p.parts[0].charts[3].length,1);
 close(p.parts[0].charts[3][0].hold,.5);
 assert.throws(()=>parseMidi(midi.subarray(0,midi.length-1)));
});

test('strip formatting tags from metadata',()=>assert.equal(cleanText('<color=#00FF00>Metallica</color>\n'), 'Metallica'));
