extends Control

const Chart = preload("res://scripts/chart.gd")
const FONT = preload("res://assets/DejaVuSans.ttf")
const BOLD = preload("res://assets/DejaVuSans-Bold.ttf")
const DEMO = preload("res://assets/night-circuit.ogg")
const BG = Color("0b0d10")
const INK = Color("eef0e9")
const MUTED = Color("81878b")
const LIME = Color("d3ff57")
const COLORS = [Color("d3ff57"), Color("a7e9dc"), Color("b5a1ff"), Color("a7e9dc"), Color("d3ff57")]
const KEYS = [KEY_D, KEY_F, KEY_SPACE, KEY_J, KEY_K]
const LABELS = ["D", "F", "SPACE", "J", "K"]
const HIT_Y = 724.0
const TOP_Y = 224.0
const LANE_W = 86.4

var screen := "menu"
var difficulty := 1
var speed := 1.0
var bpm := 123.0
var first_beat := 4.0
var offset_ms := 0.0
var title := "NIGHT CIRCUIT"
var local_track := false
var stream: AudioStream = DEMO
var player: AudioStreamPlayer
var notes: Array = []
var areas: Array = []
var fingers: Dictionary = {}
var down := [false, false, false, false, false]
var flashes := [0.0, 0.0, 0.0, 0.0, 0.0]
var clock := -2.0
var intro := -2.0
var score := 0
var combo := 0
var max_combo := 0
var judged := 0
var earned := 0.0
var counts := [0, 0, 0, 0]
var message := ""
var message_time := 0.0
var best := 0
var notice := ""
var paused_from := "playing"
var settings_back := "menu"
var song_duration := 0.0
var resume_grace := 0.0
var browser_screen := ""

func _ready() -> void:
	player = AudioStreamPlayer.new()
	add_child(player)
	player.finished.connect(_finish)
	load_settings()
	load_best()
	queue_redraw()

func _process(delta: float) -> void:
	if OS.has_feature("web") and browser_screen != screen:
		browser_screen = screen
		JavaScriptBridge.eval("window.fivefoldSetScreen(" + JSON.stringify(screen) + ")")
	for lane in range(5):
		flashes[lane] = maxf(0, flashes[lane] - delta * 3.5)
	message_time = maxf(0, message_time - delta)
	if screen == "playing":
		resume_grace = maxf(0, resume_grace - delta)
		if intro < 0:
			intro += delta
			clock = intro
			if intro >= 0:
				player.play()
		else:
			clock = maxf(0, player.get_playback_position() + AudioServer.get_time_since_last_mix() - AudioServer.get_output_latency())
		judge_notes(song_time())
	if OS.has_feature("web") and screen in ["menu", "settings"]:
		var payload = JavaScriptBridge.eval("window.fivefoldTakeTrack && window.fivefoldTakeTrack()")
		if payload is String and not payload.is_empty():
			import_track(payload)
	queue_redraw()

func song_time() -> float:
	return clock - offset_ms / 1000.0

func judge_notes(now: float) -> void:
	for note in notes:
		if note.state == 0 and now > note.time + 0.16:
			resolve(note, 0.0)
		elif note.state == 1:
			if now >= note.time + note.hold - 0.07:
				resolve(note, note.value)
			elif not down[note.lane] and resume_grace <= 0:
				resolve(note, 0.0)

func start() -> void:
	player.stop()
	notes = Chart.generate(bpm, stream.get_length(), difficulty, first_beat)
	if notes.is_empty():
		notice = "Track is too short. Change FIRST NOTE in settings."
		return
	song_duration = stream.get_length()
	player.stream = stream
	score = 0
	combo = 0
	max_combo = 0
	judged = 0
	earned = 0
	counts = [0, 0, 0, 0]
	clock = -2.0
	intro = -2.0
	message = ""
	resume_grace = 0.0
	clear_input()
	screen = "playing"
	save_settings()

func clear_input() -> void:
	fingers.clear()
	down = [false, false, false, false, false]

func resolve(note: Dictionary, value: float) -> void:
	note.state = 2
	judged += 1
	earned += value
	score = int(round(1000000.0 * earned / notes.size()))
	if value > 0:
		combo += 1
		max_combo = maxi(combo, max_combo)
		var index := 0 if value == 1.0 else (1 if value > 0.5 else 2)
		counts[index] += 1
		message = ["PERFECT", "GREAT", "GOOD"][index]
		flashes[note.lane] = 1.0
	else:
		combo = 0
		counts[3] += 1
		message = "MISS"
	message_time = 0.55

func press_lane(lane: int) -> void:
	if lane < 0 or lane > 4 or screen != "playing":
		return
	if down[lane]:
		return
	down[lane] = true
	flashes[lane] = 0.65
	var candidate: Dictionary = {}
	var distance := 0.161
	for note in notes:
		if note.time > song_time() + 0.16:
			break
		if note.lane == lane and note.state == 0:
			var error := absf(song_time() - note.time)
			if error < distance:
				distance = error
				candidate = note
	if not candidate.is_empty():
		var value: float = Chart.judgment(distance)
		if candidate.hold > 0:
			candidate.state = 1
			candidate.value = value
			message = "HOLD"
			message_time = 0.4
		else:
			resolve(candidate, value)

func release_lane(lane: int) -> void:
	if lane < 0:
		return
	# Multiple fingers or a keyboard key may hold the same lane.
	for finger_lane in fingers.values():
		if finger_lane == lane:
			return
	down[lane] = Input.is_physical_key_pressed(KEYS[lane])

func lane_at(pos: Vector2) -> int:
	if pos.y < TOP_Y or pos.x < 24 or pos.x >= 456:
		return -1
	return clampi(int((pos.x - 24) / LANE_W), 0, 4)

func _input(event: InputEvent) -> void:
	if event is InputEventKey and not event.echo:
		if event.pressed and event.physical_keycode == KEY_ESCAPE:
			if screen == "playing": pause_game()
			elif screen == "paused": resume_game()
			return
		if screen == "playing":
			var lane := KEYS.find(event.physical_keycode)
			if lane >= 0:
				if event.pressed: press_lane(lane)
				else: release_lane(lane)
		return
	var pos := Vector2.ZERO
	var pointer := -1
	var pressed := false
	if event is InputEventScreenTouch:
		pos = event.position
		pointer = event.index
		pressed = event.pressed
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		pos = event.position
		pointer = -2
		pressed = event.pressed
	else:
		return
	if not pressed:
		if fingers.has(pointer):
			var lane: int = fingers[pointer]
			fingers.erase(pointer)
			release_lane(lane)
		return
	for area in areas:
		if area.rect.has_point(pos):
			area.action.call()
			return
	if screen == "playing":
		var lane := lane_at(pos)
		if lane >= 0:
			press_lane(lane)
			fingers[pointer] = lane

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT and screen == "playing":
		pause_game()

func pause_game() -> void:
	player.stream_paused = true
	clear_input()
	screen = "paused"

func resume_game() -> void:
	# Allow a moment to re-grab held lanes without changing the chart or score.
	resume_grace = 0.5
	player.stream_paused = false
	screen = "playing"

func _finish() -> void:
	if screen != "playing": return
	for note in notes:
		if note.state != 2: resolve(note, 0.0)
	clear_input()
	screen = "results"
	if score > best:
		best = score
		var cfg := ConfigFile.new()
		cfg.load("user://scores.cfg")
		cfg.set_value(title, str(difficulty), best)
		cfg.save("user://scores.cfg")

func go_menu() -> void:
	player.stop()
	player.stream_paused = false
	clear_input()
	screen = "menu"
	load_best()

func load_best() -> void:
	var cfg := ConfigFile.new()
	cfg.load("user://scores.cfg")
	best = int(cfg.get_value(title, str(difficulty), 0))

func load_settings() -> void:
	var cfg := ConfigFile.new()
	cfg.load("user://settings.cfg")
	speed = clampf(float(cfg.get_value("play", "speed", 1.0)), 0.6, 2.0)
	offset_ms = clampf(float(cfg.get_value("play", "offset", 0.0)), -500, 500)
	difficulty = clampi(int(cfg.get_value("play", "difficulty", 1)), 0, 2)

func save_settings() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("play", "speed", speed)
	cfg.set_value("play", "offset", offset_ms)
	cfg.set_value("play", "difficulty", difficulty)
	cfg.save("user://settings.cfg")

func import_track(payload: String) -> void:
	var file = JSON.parse_string(payload)
	if not file is Dictionary: return
	if file.has("error"):
		notice = file.error
		return
	var bytes := Marshalls.base64_to_raw(file.data)
	var imported: AudioStream
	match file.ext:
		"mp3":
			var mp3 := AudioStreamMP3.new()
			mp3.data = bytes
			imported = mp3
		"ogg": imported = AudioStreamOggVorbis.load_from_buffer(bytes)
		"wav": imported = AudioStreamWAV.load_from_buffer(bytes)
	if imported == null or imported.get_length() < 8:
		notice = "Could not read audio. Use MP3, OGG or PCM WAV (8s+)."
		return
	stream = imported
	title = str(file.name).get_basename()
	local_track = true
	bpm = 123.0
	first_beat = 4.0
	notice = "Local audio loaded. Set BPM / first note in settings."
	load_best()

func pick_track() -> void:
	if OS.has_feature("web"):
		JavaScriptBridge.eval("window.fivefoldPickTrack()")
	else:
		notice = "Local audio import is available in the web version."

func use_demo() -> void:
	stream = DEMO
	title = "NIGHT CIRCUIT"
	local_track = false
	bpm = 123.0
	first_beat = 4.0
	notice = ""
	load_best()

func text_at(value: String, pos: Vector2, size: int = 16, color: Color = INK, bold: bool = false) -> void:
	draw_string(BOLD if bold else FONT, pos, value, HORIZONTAL_ALIGNMENT_LEFT, -1, size, color)

func center(value: String, y: float, size: int = 16, color: Color = INK, bold: bool = false) -> void:
	var font = BOLD if bold else FONT
	var w: float = font.get_string_size(value, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
	text_at(value, Vector2((480 - w) / 2, y), size, color, bold)

func box(rect: Rect2, fill: Color, radius: int = 12, stroke: Color = Color.TRANSPARENT) -> void:
	var style := StyleBoxFlat.new()
	style.bg_color = fill
	style.set_corner_radius_all(radius)
	if stroke.a > 0:
		style.set_border_width_all(1)
		style.border_color = stroke
	draw_style_box(style, rect)

func button(rect: Rect2, label: String, action: Callable, primary: bool = false, selected: bool = false) -> void:
	box(rect, LIME if primary else (Color("262d21") if selected else Color("171b20")), 10, LIME if selected else Color("2c3238"))
	var font = BOLD
	var size := 17 if primary else 13
	var width: float = font.get_string_size(label, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
	text_at(label, Vector2(rect.position.x + (rect.size.x - width) / 2, rect.position.y + rect.size.y / 2 + size * 0.35), size, BG if primary else (LIME if selected else INK), true)
	areas.append({"rect": rect, "action": action})

func brand() -> void:
	for i in range(5):
		draw_rect(Rect2(25 + i * 5, 29 - [5, 12, 18, 9, 14][i] / 2.0, 3, [5, 12, 18, 9, 14][i]), LIME)
	text_at("FIVEFOLD", Vector2(61, 35), 19, INK, true)
	text_at("RHYTHM / 001", Vector2(352, 33), 10, MUTED)
	draw_line(Vector2(24, 56), Vector2(456, 56), Color("292e33"))

func _draw() -> void:
	areas.clear()
	draw_rect(Rect2(0, 0, 480, 900), BG)
	match screen:
		"menu": draw_menu()
		"playing": draw_game()
		"paused": draw_pause()
		"results": draw_results()
		"settings": draw_settings()

func draw_menu() -> void:
	brand()
	text_at("FIND YOUR", Vector2(24, 119), 44, INK, true)
	text_at("FLOW STATE.", Vector2(24, 170), 44, LIME, true)
	text_at("Five lanes. One perfect moment.", Vector2(26, 202), 14, MUTED)
	# Original vector cover art; no third party imagery.
	box(Rect2(24, 227, 432, 230), Color("191e26"), 16)
	var art_center := Vector2(365, 340)
	for r in range(8):
		draw_arc(art_center, 27 + r * 12, 0.25, 5.95, 80, Color(0.69, 0.61, 1.0, 0.1 + r * 0.035), 1.5, true)
	draw_circle(art_center, 27, LIME)
	draw_colored_polygon(PackedVector2Array([Vector2(398, 245), Vector2(325, 341), Vector2(369, 329), Vector2(325, 433), Vector2(416, 307), Vector2(371, 318)]), Color("b5a1ff"))
	text_at("01 / " + ("LOCAL SESSION" if local_track else "ORIGINAL SESSION"), Vector2(44, 259), 10, LIME, true)
	text_at("YOUR" if local_track else "NIGHT", Vector2(42, 328), 40, INK, true)
	text_at("SESSION" if local_track else "CIRCUIT", Vector2(42, 373), 40, INK, true)
	text_at("FIVEFOLD STUDIO   /   SYNTH ROCK", Vector2(44, 431), 10, MUTED)
	text_at(title.left(26), Vector2(26, 494), 20, INK, true)
	text_at("%d BPM   /   %d:%02d   /   5 KEYS" % [int(bpm), int(stream.get_length()) / 60, int(stream.get_length()) % 60], Vector2(26, 521), 12, MUTED)
	for d in range(3):
		var choice := d
		button(Rect2(24 + d * 147, 543, 138, 42), ["EASY", "NORMAL", "HARD"][d], func(): difficulty = choice; load_best(), false, d == difficulty)
	button(Rect2(24, 608, 432, 62), "PLAY SESSION     >", start, true)
	button(Rect2(24, 682, 432, 46), "+  LOCAL TRACK  /  ENTER SANDMAN", pick_track)
	text_at("Your audio stays on this device. Practice chart only.", Vector2(26, 750), 11, MUTED)
	button(Rect2(24, 771, 207, 42), "SETTINGS  /  %.1fx" % speed, func(): screen = "settings")
	button(Rect2(241, 771, 215, 42), "DEMO TRACK" if local_track else "BEST  %07d" % best, use_demo if local_track else func(): pass)
	text_at(notice.left(65) if not notice.is_empty() else "TAP NOTES  /  HOLD LONG NOTES  /  USE BOTH HANDS", Vector2(24, 839), 10, LIME if not notice.is_empty() else MUTED)
	center("D   F   SPACE   J   K    /    MULTITOUCH READY", 878, 10, MUTED)

func draw_game() -> void:
	text_at("FIVEFOLD", Vector2(24, 35), 17, LIME, true)
	button(Rect2(392, 14, 64, 40), "II", pause_game)
	text_at(title.left(29), Vector2(24, 79), 16, INK, true)
	text_at(["EASY", "NORMAL", "HARD"][difficulty] + "  /  %.1fx" % speed, Vector2(24, 102), 11, MUTED)
	text_at("SCORE", Vector2(24, 139), 10, MUTED)
	text_at("%07d" % score, Vector2(22, 179), 38, INK, true)
	text_at("ACCURACY", Vector2(326, 139), 10, MUTED)
	text_at("%.1f%%" % (earned / judged * 100 if judged else 100), Vector2(326, 176), 24, LIME, true)
	draw_rect(Rect2(24, 204, 432, 3), Color("252a30"))
	draw_rect(Rect2(24, 204, 432 * clampf(clock / song_duration, 0, 1), 3), LIME)
	for lane in range(5):
		var x := 24 + lane * LANE_W
		draw_rect(Rect2(x, TOP_Y, LANE_W - 1, HIT_Y - TOP_Y + 34), Color("14171c") if lane % 2 == 0 else Color("101318"))
		if down[lane] or flashes[lane] > 0:
			var alpha: float = maxf(0.06 if down[lane] else 0.0, flashes[lane] * 0.12)
			draw_rect(Rect2(x, TOP_Y, LANE_W - 1, HIT_Y - TOP_Y + 34), Color(COLORS[lane], alpha))
		for band in range(8):
			var y := HIT_Y - band * 68 + fmod(song_time() * 45, 68)
			if y < HIT_Y and y > TOP_Y:
				draw_line(Vector2(x, y), Vector2(x + LANE_W - 1, y), Color("252a30"), 1)
	var travel := 2.2 / speed
	for note in notes:
		if note.state == 2: continue
		var y: float = HIT_Y - (note.time - song_time()) / travel * (HIT_Y - TOP_Y)
		var end_y: float = y - note.hold / travel * (HIT_Y - TOP_Y)
		if y < TOP_Y or end_y > HIT_Y + 30: continue
		var x: float = 24 + note.lane * LANE_W + 7
		var color: Color = COLORS[note.lane]
		if note.hold > 0:
			var top: float = maxf(TOP_Y, end_y)
			var bottom: float = HIT_Y if note.state == 1 else minf(y, HIT_Y + 30)
			if bottom > top:
				box(Rect2(x + 15, top, LANE_W - 44, bottom - top), Color(color, 0.3), 4)
				draw_line(Vector2(x + LANE_W / 2 - 7, top), Vector2(x + LANE_W / 2 - 7, bottom), color, 2)
		if note.state == 1: y = HIT_Y
		if y >= TOP_Y and y <= HIT_Y + 30:
			box(Rect2(x, y - 7, LANE_W - 14, 14), color, 4)
			draw_rect(Rect2(x + 5, y - 5, LANE_W - 24, 2), Color(1, 1, 1, 0.55))
	draw_line(Vector2(24, HIT_Y), Vector2(456, HIT_Y), LIME, 2)
	for lane in range(5):
		var rect := Rect2(24 + lane * LANE_W, 770, LANE_W - 3, 80)
		box(rect, COLORS[lane] if down[lane] else Color("22282d"), 9, Color(COLORS[lane], 0.45))
		var label: String = LABELS[lane]
		text_at(label, Vector2(rect.position.x + (rect.size.x - BOLD.get_string_size(label, HORIZONTAL_ALIGNMENT_LEFT, -1, 13).x) / 2, 817), 13, BG if down[lane] else COLORS[lane], true)
		if flashes[lane] > 0:
			draw_arc(Vector2(rect.get_center().x, HIT_Y), 15 + (1 - flashes[lane]) * 40, 0, TAU, 40, Color(COLORS[lane], flashes[lane]), 2, true)
	if combo >= 2:
		center(str(combo), 316, 42, INK, true)
		center("COMBO", 336, 10, MUTED)
	if message_time > 0:
		center(message, 405, 22, Color("ff7e92") if message == "MISS" else LIME, true)
	if clock < 0:
		center(str(ceili(-clock)), 482, 72, LIME, true)
	elif clock < first_beat - 0.5:
		center("FIND THE BEAT", 460, 18, LIME, true)
	center("HOLD THE LONG NOTES  /  ESC TO PAUSE", 881, 10, MUTED)

func draw_pause() -> void:
	brand()
	center("TAKE A BREATH.", 260, 32, INK, true)
	center("Your session is paused.", 300, 15, MUTED)
	button(Rect2(48, 370, 384, 62), "RESUME SESSION", resume_game, true)
	button(Rect2(48, 450, 384, 50), "RESTART", func(): player.stream_paused = false; start())
	button(Rect2(48, 518, 384, 50), "BACK TO TRACKS", go_menu)
	center("Audio pauses when you leave this tab.", 652, 12, MUTED)

func draw_results() -> void:
	brand()
	text_at("SESSION COMPLETE", Vector2(24, 109), 12, LIME, true)
	text_at(title.left(27), Vector2(24, 147), 24, INK, true)
	var accuracy := earned / maxf(1, notes.size()) * 100
	var grade := "S" if accuracy >= 95 else ("A" if accuracy >= 85 else ("B" if accuracy >= 70 else ("C" if accuracy >= 50 else "D")))
	draw_circle(Vector2(240, 284), 88, Color("202820"))
	draw_arc(Vector2(240, 284), 88, -PI / 2, -PI / 2 + TAU * maxf(0.01, accuracy / 100), 100, LIME, 4, true)
	center(grade, 316, 86, LIME, true)
	center("%07d" % score, 432, 48, INK, true)
	center("BEST  %07d" % best, 460, 12, MUTED)
	box(Rect2(24, 491, 432, 80), Color("171b20"))
	text_at("ACCURACY", Vector2(44, 519), 11, MUTED)
	text_at("%.2f%%" % accuracy, Vector2(44, 552), 24, INK, true)
	text_at("MAX COMBO", Vector2(281, 519), 11, MUTED)
	text_at(str(max_combo), Vector2(281, 552), 24, LIME, true)
	for i in range(4):
		var x := 24 + i * 110
		text_at(["PERFECT", "GREAT", "GOOD", "MISS"][i], Vector2(x, 608), 10, MUTED)
		text_at(str(counts[i]), Vector2(x, 643), 25, Color("ff7e92") if i == 3 else INK, true)
	button(Rect2(24, 695, 432, 62), "PLAY AGAIN", start, true)
	button(Rect2(24, 773, 432, 48), "BACK TO TRACKS", go_menu)
	center("ONE MORE SESSION. ONE STEP CLOSER.", 878, 10, MUTED)

func setting_row(y: float, label: String, value: String, minus: Callable, plus: Callable) -> void:
	text_at(label, Vector2(24, y), 12, MUTED)
	box(Rect2(24, y + 16, 432, 58), Color("171b20"))
	center(value, y + 54, 23, INK, true)
	button(Rect2(30, y + 21, 60, 48), "-", minus)
	button(Rect2(390, y + 21, 60, 48), "+", plus)

func draw_settings() -> void:
	brand()
	text_at("MAKE IT YOURS.", Vector2(24, 121), 32, INK, true)
	text_at("Tune the feel. Keep the rhythm.", Vector2(24, 155), 14, MUTED)
	setting_row(205, "NOTE SPEED", "%.1fx" % speed, func(): speed = maxf(0.6, snappedf(speed - 0.1, 0.1)), func(): speed = minf(2.0, snappedf(speed + 0.1, 0.1)))
	setting_row(320, "TIMING OFFSET", "%+d ms" % int(offset_ms), func(): offset_ms = maxf(-500, offset_ms - 10), func(): offset_ms = minf(500, offset_ms + 10))
	text_at("Positive = notes arrive later. Wired audio recommended.", Vector2(24, 420), 11, MUTED)
	if local_track:
		setting_row(467, "PRACTICE BPM", str(int(bpm)), func(): bpm = maxf(60, bpm - 1), func(): bpm = minf(240, bpm + 1))
		setting_row(582, "FIRST NOTE / SECONDS INTO AUDIO", "%.1f s" % first_beat, func(): first_beat = maxf(0, first_beat - 0.1), func(): first_beat = minf(stream.get_length() - 3, first_beat + 0.1))
		text_at("Generated practice pattern, not an original song chart.", Vector2(24, 696), 11, MUTED)
	else:
		text_at("PERFECT   +/- 55 ms", Vector2(24, 488), 15, LIME)
		text_at("GREAT       +/- 105 ms", Vector2(24, 522), 15, INK)
		text_at("GOOD         +/- 160 ms", Vector2(24, 556), 15, INK)
		text_at("Hold notes until the tail reaches the line.", Vector2(24, 625), 13, MUTED)
		text_at("D / F / SPACE / J / K or five touch lanes.", Vector2(24, 653), 13, MUTED)
	button(Rect2(24, 756, 432, 60), "SAVE & BACK", func(): save_settings(); screen = "menu", true)
	center("FIVEFOLD  /  GODOT 4.7.2  /  WEB PROTOTYPE", 878, 10, MUTED)
