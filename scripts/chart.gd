class_name RhythmChart
extends RefCounted

## Original deterministic practice patterns. These are not transcriptions of a song.
static func generate(bpm: float, duration: float, difficulty: int, first_beat: float = 4.0) -> Array:
	var notes: Array = []
	var beat := 60.0 / bpm
	var step := beat if difficulty == 0 else beat / 2.0
	var index := 0
	var t := first_beat
	var busy_until := [-1.0, -1.0, -1.0, -1.0, -1.0]
	var pattern := [0, 2, 1, 3, 2, 4, 3, 1, 0, 1, 4, 2, 3, 0, 2, 4]
	while t < duration - 2.0:
		var lane: int = pattern[index % pattern.size()]
		# Breathing room on normal; hard adds alternating two-note chords.
		if difficulty != 1 or index % 8 != 7:
			if t > busy_until[lane] + 0.18:
				var hold := beat * 1.5 if index % 16 == 12 else 0.0
				notes.append({"time": t, "lane": lane, "hold": hold, "state": 0, "value": 0.0})
				busy_until[lane] = t + hold
			if difficulty == 2 and index % 8 == 0:
				var other := (lane + 2) % 5
				if t > busy_until[other] + 0.18:
					notes.append({"time": t, "lane": other, "hold": 0.0, "state": 0, "value": 0.0})
					busy_until[other] = t
		index += 1
		t = first_beat + index * step
	notes.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return a.time < b.time)
	return notes

static func judgment(error: float) -> float:
	var delta := absf(error)
	if delta <= 0.055:
		return 1.0
	if delta <= 0.105:
		return 0.7
	if delta <= 0.16:
		return 0.4
	return 0.0
