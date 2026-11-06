extends SceneTree

const Chart = preload("res://scripts/chart.gd")
var failures := 0

func check(condition: bool, label: String) -> void:
	if not condition:
		push_error(label)
		failures += 1

func _initialize() -> void:
	call_deferred("run")

func run() -> void:
	for difficulty in range(3):
		var notes := Chart.generate(123, 68.44, difficulty)
		check(notes.size() > 80, "chart has playable notes")
		var ends := [-100.0, -100.0, -100.0, -100.0, -100.0]
		var previous := -1.0
		for note in notes:
			check(note.time >= previous, "chart sorted")
			check(note.time > ends[note.lane] + .17, "no overlaps or retrigger during hold")
			check(note.time + note.hold < 68.44, "all notes finish before audio")
			ends[note.lane] = note.time + note.hold
			previous = note.time
	check(Chart.judgment(.055) == 1, "perfect boundary")
	check(Chart.judgment(-.105) == .7, "great boundary")
	check(Chart.judgment(.16) == .4, "good boundary")
	check(Chart.judgment(.161) == 0, "outside hit window")
	var game = load("res://main.tscn").instantiate()
	root.add_child(game)
	game.set_process(false)
	game.difficulty = 2
	game.start()
	# Simulate a perfect complete run, including every hold and chord.
	for note in game.notes:
		game.clock = note.time
		game.press_lane(note.lane)
		if note.hold > 0:
			check(note.state == 1, "hold begins without awarding score")
			game.resolve(note, note.value)
		game.down[note.lane] = false
	check(game.score == 1000000, "perfect run scores one million")
	check(game.combo == game.notes.size(), "perfect full combo")
	check(game.counts[0] == game.notes.size(), "perfect statistics count each note once")
	game.start()
	game.clock = 6
	game.notes = [{"time": 6.0, "lane": 0, "hold": 1.0, "state": 0, "value": 0.0}]
	game.press_lane(0)
	game.down[0] = false
	game.judge_notes(6.4)
	check(game.counts[3] == 1, "early release fails long note")
	game.judge_notes(8)
	check(game.counts[3] == 1, "miss only counted once")
	game.start()
	# Two independent touch contacts; releasing one must not release the other.
	for id in range(2):
		var event := InputEventScreenTouch.new()
		event.index = id
		event.position = Vector2(55 + id * 90, 810)
		event.pressed = true
		game._input(event)
	check(game.down[0] and game.down[1], "simultaneous five-lane touch handling")
	var release := InputEventScreenTouch.new()
	release.index = 0
	release.pressed = false
	game._input(release)
	check(not game.down[0] and game.down[1], "independent finger release")
	game.pause_game()
	check(game.screen == "paused" and not game.down[1], "pause clears touch state")
	var before: Array = game.notes.duplicate(true)
	game.resume_game()
	check(game.notes == before, "resume does not change original chart")
	check(game.resume_grace == .5, "resume allows holds to be re-grabbed")
	game.start()
	game.judge_notes(999)
	check(game.counts[3] == game.notes.size(), "unplayed chart resolves every miss")
	check(game.score == 0, "misses do not award points")
	game.queue_free()
	print("Game checks complete: ", failures, " failure(s)")
	quit(1 if failures else 0)
