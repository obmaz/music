"""Generate NIGHT CIRCUIT, an original CC0 synth-rock loop (not a cover).
Requires numpy and ffmpeg. No sampled or downloaded audio is used.
"""
from pathlib import Path
import subprocess
import wave
import numpy as np

RATE = 22050
BPM = 123
BEAT = 60 / BPM
START = 4.0
LENGTH = START + 128 * BEAT + 2
rng = np.random.default_rng(51)
audio = np.zeros(int(LENGTH * RATE))

def add(time, sound, gain=1):
    start = round(time * RATE)
    end = min(len(audio), start + len(sound))
    audio[start:end] += sound[:end-start] * gain

def tone(freq, duration, gain=.16, pluck=True):
    t = np.arange(int(duration * RATE)) / RATE
    wave = np.sin(2*np.pi*freq*t) + .32*np.sin(2*np.pi*freq*2*t) + .16*np.sin(2*np.pi*freq*3*t)
    envelope = np.minimum(t/.008, 1) * np.exp(-t * (6 if pluck else 1.5))
    envelope *= np.minimum((duration-t)/.035, 1)
    return wave * envelope * gain

roots = [110, 130.8128, 97.9989, 146.8324]
# A quiet four-second intro; the chart starts with the full band at 4 seconds.
for i in range(8):
    add(i*.5, tone(440 if i%2==0 else 659.255, .4, .055))
for i in range(128):
    time = START + i*BEAT
    root = roots[(i // 16) % 4]
    add(time, tone(root, BEAT*.82, .21))
    add(time+BEAT*.5, tone(root*1.5, BEAT*.36, .1))
    t = np.arange(int(.22*RATE))/RATE
    kick = np.sin(2*np.pi*(48*t+7*(1-np.exp(-t*35))))*np.exp(-t*24)
    if i%4 in (0, 2): add(time, kick, .58)
    if i%4 in (1, 3):
        snare = rng.normal(size=len(t))*np.exp(-t*23)
        snare = np.concatenate(([0], np.diff(snare)))
        add(time, snare, .12)
    for half in range(2):
        t = np.arange(int(.065*RATE))/RATE
        hat = rng.normal(size=len(t))*np.exp(-t*75)
        hat = np.concatenate(([0], np.diff(hat)))
        add(time+half*BEAT/2, hat, .035 if half else .055)
    # Original pentatonic arpeggio, independent of any commercial song.
    for half in range(2):
        degree = [0, 7, 12, 3, 10, 7, 15, 12][(i*2+half)%8]
        add(time+half*BEAT/2, tone(root*2*2**(degree/12), BEAT*.65, .085))
audio = np.tanh(audio*1.25)*.82
fade = min(RATE*2, len(audio))
audio[-fade:] *= np.linspace(1, 0, fade)
root = Path(__file__).resolve().parents[1]
wav = root/'assets/night-circuit.wav'
with wave.open(str(wav), 'wb') as f:
    f.setnchannels(1)
    f.setsampwidth(2)
    f.setframerate(RATE)
    f.writeframes((audio*32767).astype('<i2').tobytes())
subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(wav),'-c:a','libvorbis','-q:a','5',str(wav.with_suffix('.ogg'))], check=True)
wav.unlink()
print(f'Generated original track: {LENGTH:.2f}s / {BPM} BPM')
