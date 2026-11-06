# Original assets

The original `assets/night-circuit.ogg` audio, `tools/generate_audio.py` composition,
`assets/feedback/*.wav` feedback sounds and their `tools/generate_feedback.py` generator,
`assets/icon.svg`, its rendered PNG app icons in `web/icons/`, vector artwork in `scripts/game.gd`, and generated practice
patterns in `scripts/chart.gd` are dedicated to the public domain under
[CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).
To the extent possible under law, the contributors waive all copyright and
related or neighboring rights to these original assets.

The music is synthesized from oscillators and deterministic noise. It contains
no downloaded recordings, samples, lyrics, or transcription of Enter Sandman.
Regenerate with `python3 tools/generate_audio.py` (NumPy and FFmpeg required).

The feedback sounds use only synthesized oscillators and deterministic noise;
regenerate with `python3 tools/generate_feedback.py` (Python standard library only).

Fonts retain their own license: see `assets/FONT-LICENSE.txt`.
Godot retains its own license and third-party notices in `licenses/` (copied into the web build).
Metallica recordings, compositions, logos and album art are not distributed.

## SNG test fixtures

`tests/fixtures/reference-chart.sng` and `reference-midi.sng` contain only
synthetic test charts, a 12-second extract of the original NIGHT CIRCUIT audio,
and a synthesized sine-wave stem. These original test assets are also CC0 1.0.
They were encoded with the reference SngCli v0.3.0; the tool itself is not bundled.
