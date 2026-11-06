extends SceneTree

func _initialize() -> void:
	var svg := FileAccess.get_file_as_string("res://assets/icon.svg")
	DirAccess.make_dir_recursive_absolute("res://web/icons")
	for size in [180, 192, 512]:
		var icon := Image.new()
		if icon.load_svg_from_string(svg, float(size) / 256.0) != OK:
			push_error("Could not render app icon")
			quit(1)
			return
		var background := Image.create(size, size, false, Image.FORMAT_RGBA8)
		background.fill(Color("0b0d10"))
		background.blend_rect(icon, Rect2i(0, 0, size, size), Vector2i.ZERO)
		if background.save_png("res://web/icons/icon-%d.png" % size) != OK:
			quit(1)
			return
	quit(0)
