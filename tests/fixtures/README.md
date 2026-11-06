# Reference SNG fixtures

These containers were created with the upstream reference encoder, not the
JavaScript reader under test:

- Tool: https://github.com/mdsitton/SngFileFormat/releases/tag/v0.3.0
- Platform: `SngCli-linux-x64.tar.gz`
- Command: `SngCli encode -i <songs> -o <output> -t 1 --noStatusBar --verbose`

`reference-chart.sng` contains the included `reference.chart` as `notes.chart`,
a 12-second OGG extract of the project's original `assets/night-circuit.ogg`,
and song.ini / SNG metadata: name `SNG REFERENCE CHART`, artist `FIVEFOLD TEST`,
charter `FIVEFOLD`, delay `100`. It has Easy/Expert guitar and Hard bass charts.
The chart starts at 120 BPM, changes to 60 BPM at tick 384, and includes a
sustain spanning that change, a chord, forced-note flag and open note.

`reference-midi.sng` contains the included `reference.mid` as `notes.mid`,
the same original audio excerpt encoded as Opus, and an additional quiet
220 Hz sine-wave stem as guitar.ogg. Metadata: name `SNG REFERENCE MIDI`,
artist `FIVEFOLD TEST`, charter `FIVEFOLD`, delay `100`.
It contains an Expert PART GUITAR track plus a tempo track.

Recreate the audio with FFmpeg, for example:

```
ffmpeg -i assets/night-circuit.ogg -t 12 song.ogg
ffmpeg -i assets/night-circuit.ogg -t 12 -c:a libopus song.opus
ffmpeg -f lavfi -i sine=frequency=220:duration=12 -af volume=0.02 guitar.ogg
```

All fixture chart/audio content is original and CC0 1.0; see `/ASSETS.md`.
No Metallica or other commercial recordings or charts are included.
