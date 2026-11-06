"""Generate original, short CC0 rhythm-game feedback sounds. Standard library only."""
from pathlib import Path
import math
import random
import struct
import wave

ROOT = Path(__file__).resolve().parents[1] / 'assets' / 'feedback'
ROOT.mkdir(parents=True, exist_ok=True)
RATE = 24000

def write(name, frequency, duration, peak, seed, dry=False):
    rng = random.Random(seed)
    samples = []
    previous = 0.0
    for i in range(round(RATE * duration)):
        t = i / RATE
        noise = rng.uniform(-1, 1)
        transient = (noise - previous) * math.exp(-t * (190 if dry else 150))
        previous = noise
        tone = math.sin(2 * math.pi * frequency * t) * math.exp(-t * (110 if dry else 65))
        tone += .28 * math.sin(2 * math.pi * frequency * 2.04 * t) * math.exp(-t * 115)
        envelope = min(1, t / .0006) * min(1, (duration - t) / .006)
        samples.append((.55 * transient + .25 * tone if dry else .22 * transient + .78 * tone) * envelope)
    gain = peak / max(abs(x) for x in samples)
    with wave.open(str(ROOT / name), 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes(b''.join(struct.pack('<h', round(x * gain * 32767)) for x in samples))

for lane, frequency in enumerate([587.33, 659.25, 783.99, 880.0, 1046.5]):
    write(f'hit-{lane}.wav', frequency, .085, .32, lane + 21)
write('tap.wav', 1800, .038, .22, 91, dry=True)
print('Generated 5 lane hit sounds and one dry tap sound.')
