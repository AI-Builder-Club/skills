#!/usr/bin/env python3
import argparse
import json
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont


DEFAULT_CANVAS = {"width": 1280, "height": 800, "fps": 20, "frames": 48}
RENDER_SCALE = 2

THEMES = {
    "light": {
        "bg": "#f6f2df",
        "text": "#15120f",
        "muted": "#665d50",
        "frame": "#cfc7b6",
        "panel": "#fffaf0",
        "blue": "#2f6fb6",
        "blue_fill": "#edf5ff",
        "green": "#3b946d",
        "green_fill": "#eef8ef",
        "purple": "#8d4ba7",
        "purple_fill": "#f7ecfb",
        "red": "#b85f56",
        "red_fill": "#fff0ec",
        "dark": "#5b6468",
        "dark_fill": "#f5f2e9",
        "highlight": "#dff0cf",
        "motion": "#0077ff",
        "motion_core": "#ffffff",
        "grain_min": 1,
        "grain_max": 5,
        "vignette": 20,
    },
    "dark": {
        "bg": "#050607",
        "text": "#f2f1ec",
        "muted": "#c8cbc5",
        "frame": "#596268",
        "panel": "#070a08",
        "blue": "#41a6ff",
        "blue_fill": "#041923",
        "green": "#2bd87d",
        "green_fill": "#03180c",
        "purple": "#c56bff",
        "purple_fill": "#14081a",
        "red": "#d07367",
        "red_fill": "#5a2924",
        "dark": "#596268",
        "dark_fill": "#070a08",
        "highlight": "#173f35",
        "motion": "#2cff8f",
        "motion_core": "#f2f1ec",
        "grain_min": 3,
        "grain_max": 12,
        "vignette": 110,
    },
}


def px(value):
    return int(round(float(value) * RENDER_SCALE))


def rgba(hex_color, alpha=255):
    raw = hex_color.strip().lstrip("#")
    return tuple(int(raw[i : i + 2], 16) for i in (0, 2, 4)) + (int(alpha),)


def contains_cjk(text):
    return any("\u3400" <= char <= "\u9fff" for char in str(text))


def font_paths(cjk=False, display=False, bold=False):
    regular = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "C:\\Windows\\Fonts\\arialbd.ttf" if bold else "C:\\Windows\\Fonts\\arial.ttf",
    ]
    if cjk:
        return [
            "/System/Library/Fonts/STHeiti Medium.ttc" if bold else "/System/Library/Fonts/STHeiti Light.ttc",
            "/System/Library/Fonts/Hiragino Sans GB.ttc",
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc" if bold else "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
            "C:\\Windows\\Fonts\\msyhbd.ttc" if bold else "C:\\Windows\\Fonts\\msyh.ttc",
        ] + regular
    if display:
        return [
            str(Path.home() / "Library/Fonts/Excalifont-Regular.woff2"),
            "/Library/Fonts/Excalifont-Regular.woff2",
            "/System/Library/Fonts/Supplemental/Excalifont-Regular.woff2",
            str(Path.home() / "Library/Fonts/Excalifont-Regular.ttf"),
            "/Library/Fonts/Excalifont-Regular.ttf",
            "/System/Library/Fonts/Supplemental/Chalkduster.ttf",
            "/System/Library/Fonts/MarkerFelt.ttc",
            "/System/Library/Fonts/Supplemental/Bradley Hand Bold.ttf",
            "/System/Library/Fonts/Supplemental/ChalkboardSE.ttc",
            "/System/Library/Fonts/Noteworthy.ttc",
            "/usr/share/fonts/truetype/comic-neue/ComicNeue-Bold.ttf" if bold else "/usr/share/fonts/truetype/comic-neue/ComicNeue-Regular.ttf",
        ] + regular
    return regular


def get_font(size, text="", display=False, bold=False):
    use_cjk = contains_cjk(text)
    for candidate in font_paths(cjk=use_cjk, display=display and not use_cjk, bold=bold):
        try:
            return ImageFont.truetype(candidate, px(size))
        except OSError:
            pass
    return ImageFont.load_default()


def text_box(draw, text, font, spacing=4):
    if not text:
        return 0, 0
    box = draw.multiline_textbbox((0, 0), str(text), font=font, spacing=px(spacing))
    return box[2] - box[0], box[3] - box[1]


def wrap_words(draw, line, font, max_width):
    text = str(line)
    tokens = list(text) if contains_cjk(text) else text.split()
    if not tokens:
        return [""]
    separator = "" if contains_cjk(text) else " "
    rows = []
    active = ""
    for token in tokens:
        proposal = token if not active else f"{active}{separator}{token}"
        if text_box(draw, proposal, font)[0] <= max_width:
            active = proposal
            continue
        if active:
            rows.append(active)
            active = ""
        chunk = ""
        for char in token:
            test = chunk + char
            if chunk and text_box(draw, test, font)[0] > max_width:
                rows.append(chunk)
                chunk = char
            else:
                chunk = test
        active = chunk
    if active:
        rows.append(active)
    return rows


def wrap_text(draw, text, font, max_width):
    rows = []
    for raw_line in str(text).splitlines():
        rows.extend(wrap_words(draw, raw_line, font, max_width))
    return "\n".join(rows) if rows else ""


def fitted_text(draw, text, width, height, start_size, min_size=8, display=True, bold=False, spacing=4, wrap=True):
    source = str(text or "")
    for size in range(int(start_size), int(min_size) - 1, -1):
        font = get_font(size, source, display=display, bold=bold)
        candidates = [wrap_text(draw, source, font, px(width))] if wrap else [source]
        if wrap and candidates[0] != source:
            candidates.append(source)
        for candidate in candidates:
            tw, th = text_box(draw, candidate, font, spacing=spacing)
            if tw <= px(width) and th <= px(height):
                return candidate, font
    font = get_font(min_size, source, display=display, bold=bold)
    return wrap_text(draw, source, font, px(width)) if wrap else source, font


def draw_fitted(draw, text, x, y, width, height, size, fill, align="center", bold=False, min_size=8, spacing=4, wrap=True):
    fitted, font = fitted_text(draw, text, width, height, size, min_size=min_size, bold=bold, spacing=spacing, wrap=wrap)
    tw, th = text_box(draw, fitted, font, spacing=spacing)
    if align == "left":
        tx = px(x)
    elif align == "right":
        tx = px(x + width) - tw
    else:
        tx = px(x) + (px(width) - tw) / 2
    ty = px(y) + (px(height) - th) / 2
    offsets = [(0, 0)]
    if bold:
        offsets = [(0, 0), (1, 0), (0, 1), (1, 1)]
    for ox, oy in offsets:
        draw.multiline_text((tx + ox, ty + oy), fitted, font=font, fill=rgba(fill), spacing=px(spacing), align=align)


def segment_length(a, b):
    return math.hypot(b[0] - a[0], b[1] - a[1])


def line_length(points):
    return sum(segment_length(left, right) for left, right in zip(points, points[1:]))


def point_on_line(points, distance):
    if not points:
        return (0, 0)
    remaining = distance
    for left, right in zip(points, points[1:]):
        length = segment_length(left, right)
        if length <= 0:
            continue
        if remaining <= length:
            t = remaining / length
            return (left[0] + (right[0] - left[0]) * t, left[1] + (right[1] - left[1]) * t)
        remaining -= length
    return points[-1]


def point_at_progress(points, progress):
    total = line_length(points)
    return point_on_line(points, (progress % 1.0) * total) if total else points[0]


def rounded_route(points, radius=30, steps=10):
    if len(points) < 3:
        return points
    route = [points[0]]
    for before, corner, after in zip(points, points[1:], points[2:]):
        incoming = segment_length(before, corner)
        outgoing = segment_length(corner, after)
        if incoming <= 0 or outgoing <= 0:
            route.append(corner)
            continue
        in_unit = ((before[0] - corner[0]) / incoming, (before[1] - corner[1]) / incoming)
        out_unit = ((after[0] - corner[0]) / outgoing, (after[1] - corner[1]) / outgoing)
        cross = abs(in_unit[0] * out_unit[1] - in_unit[1] * out_unit[0])
        if cross < 0.01:
            route.append(corner)
            continue
        distance = min(radius, incoming * 0.42, outgoing * 0.42)
        start = (corner[0] + in_unit[0] * distance, corner[1] + in_unit[1] * distance)
        end = (corner[0] + out_unit[0] * distance, corner[1] + out_unit[1] * distance)
        route.append(start)
        for index in range(1, steps):
            t = index / steps
            x = (1 - t) * (1 - t) * start[0] + 2 * (1 - t) * t * corner[0] + t * t * end[0]
            y = (1 - t) * (1 - t) * start[1] + 2 * (1 - t) * t * corner[1] + t * t * end[1]
            route.append((x, y))
        route.append(end)
    route.append(points[-1])
    return route


class FlowGifRenderer:
    def __init__(self, spec):
        self.spec = spec
        self.canvas = {**DEFAULT_CANVAS, **spec.get("canvas", {})}
        self.theme = self.load_theme(spec.get("theme", {"name": "light"}))
        self.nodes = {node["id"]: node for node in spec.get("nodes", [])}

    def load_theme(self, raw_theme):
        if isinstance(raw_theme, str):
            preset = raw_theme
            overrides = {}
        else:
            raw_theme = raw_theme or {}
            preset = raw_theme.get("name") or raw_theme.get("preset") or "light"
            overrides = {key: value for key, value in raw_theme.items() if key not in {"name", "preset", "mode"}}
        if preset not in THEMES:
            raise ValueError(f"unknown theme preset: {preset}")
        return {**THEMES[preset], **overrides}

    def node_colors(self, node):
        if node.get("stroke") or node.get("fill"):
            return node.get("stroke", self.theme["frame"]), node.get("fill", self.theme["panel"])
        key = node.get("color", "green")
        return self.theme.get(key, self.theme["green"]), self.theme.get(f"{key}_fill", self.theme["panel"])

    def blank(self):
        return Image.new("RGBA", (px(self.canvas["width"]), px(self.canvas["height"])), rgba(self.theme["bg"]))

    def draw_header(self, draw):
        title = self.spec.get("title", {})
        draw.rounded_rectangle((px(28), px(25), px(38), px(78)), radius=px(4), fill=rgba(self.theme["purple"]))
        draw_fitted(draw, title.get("text", ""), 54, 20, 390, 54, 35, self.theme["text"], align="left", bold=True, min_size=22, wrap=False)
        highlight = title.get("highlight", "")
        if highlight:
            draw.rounded_rectangle((px(470), px(22), px(830), px(80)), radius=px(18), fill=rgba(self.theme["highlight"]), outline=rgba(self.theme["green"]), width=px(1))
            draw_fitted(draw, highlight, 492, 18, 318, 64, 30, self.theme["green"], bold=True, min_size=18, wrap=False)
        draw_fitted(draw, title.get("subtitle", ""), 54, 88, 760, 26, 15, self.theme["muted"], align="left", min_size=10)
        draw.rounded_rectangle(
            (px(20), px(120), px(self.canvas["width"] - 20), px(self.canvas["height"] - 25)),
            radius=px(28),
            outline=rgba(self.theme["frame"]),
            width=px(2),
        )

    def shape_rect(self, draw, node, stroke, fill):
        x, y, w, h = node["x"], node["y"], node["w"], node["h"]
        radius = node.get("radius", 14 if node.get("type") != "note" else 18)
        draw.rounded_rectangle((px(x), px(y), px(x + w), px(y + h)), radius=px(radius), fill=rgba(fill), outline=rgba(stroke), width=px(node.get("width", 2)))

    def shape_diamond(self, draw, node, stroke, fill):
        x, y, w, h = node["x"], node["y"], node["w"], node["h"]
        points = [(x + w / 2, y), (x + w, y + h / 2), (x + w / 2, y + h), (x, y + h / 2)]
        scaled = [(px(a), px(b)) for a, b in points]
        draw.polygon(scaled, fill=rgba(fill), outline=rgba(stroke))
        draw.line(scaled + [scaled[0]], fill=rgba(stroke), width=px(2))

    def draw_node(self, draw, node):
        node_type = node.get("type", "box")
        x, y, w, h = node["x"], node["y"], node["w"], node["h"]
        if node_type == "label":
            draw_fitted(
                draw,
                node.get("label", ""),
                x,
                y,
                w,
                h,
                node.get("size", 18),
                node.get("fill", self.theme["muted"]),
                align=node.get("align", "left"),
                bold=node.get("bold", True),
                min_size=9,
            )
            return
        stroke, fill = self.node_colors(node)
        if node_type == "diamond":
            self.shape_diamond(draw, node, stroke, fill)
            draw_fitted(draw, node.get("label", ""), x + w * 0.18, y + h * 0.20, w * 0.64, h * 0.28, node.get("label_size", 20), self.theme["text"], bold=node.get("label_bold", True))
            draw_fitted(draw, node.get("body", ""), x + w * 0.22, y + h * 0.48, w * 0.56, h * 0.25, node.get("body_size", 13), self.theme["muted"], min_size=9)
            return
        self.shape_rect(draw, node, stroke, fill)
        label_h = node.get("label_h", min(42, h * 0.34))
        draw_fitted(draw, node.get("label", ""), x + 14, y + 10, w - 28, label_h, node.get("label_size", 22), self.theme["text"], align="left", bold=node.get("label_bold", True), min_size=12)
        draw_fitted(draw, node.get("body", ""), x + 14, y + label_h + 12, w - 28, h - label_h - 22, node.get("body_size", 14), self.theme["text"], align="left", min_size=8)

    def node_center(self, node_id):
        node = self.nodes[node_id]
        return (node["x"] + node["w"] / 2, node["y"] + node["h"] / 2)

    def node_boundary_point(self, node, toward):
        cx = node["x"] + node["w"] / 2
        cy = node["y"] + node["h"] / 2
        dx = toward[0] - cx
        dy = toward[1] - cy
        if dx == 0 and dy == 0:
            return (cx, cy)
        half_w = node["w"] / 2
        half_h = node["h"] / 2
        if node.get("type") == "diamond":
            scale = 1 / ((abs(dx) / half_w) + (abs(dy) / half_h))
        else:
            scale_x = half_w / abs(dx) if dx else float("inf")
            scale_y = half_h / abs(dy) if dy else float("inf")
            scale = min(scale_x, scale_y)
        return (cx + dx * scale, cy + dy * scale)

    def edge_points(self, edge):
        if "points" in edge:
            return [tuple(point) for point in edge["points"]]
        start_node = self.nodes[edge["from"]]
        end_node = self.nodes[edge["to"]]
        start_center = self.node_center(edge["from"])
        end_center = self.node_center(edge["to"])
        return [
            self.node_boundary_point(start_node, end_center),
            self.node_boundary_point(end_node, start_center),
        ]

    def draw_arrow(self, draw, points, color, width=2, arrow=True, dashed=False):
        route = rounded_route(points)
        scaled = [(px(x), px(y)) for x, y in route]
        if dashed:
            total = line_length(route)
            cursor = 0
            while cursor < total:
                a = point_on_line(route, cursor)
                b = point_on_line(route, min(total, cursor + 10))
                draw.line([(px(a[0]), px(a[1])), (px(b[0]), px(b[1]))], fill=rgba(color), width=px(width))
                cursor += 20
        else:
            draw.line(scaled, fill=rgba(color), width=px(width), joint="curve")
        if arrow and len(route) >= 2:
            a, b = route[-2], route[-1]
            angle = math.atan2(b[1] - a[1], b[0] - a[0])
            length = 15 + width
            spread = 0.48
            left = (b[0] - length * math.cos(angle - spread), b[1] - length * math.sin(angle - spread))
            right = (b[0] - length * math.cos(angle + spread), b[1] - length * math.sin(angle + spread))
            draw.line([(px(left[0]), px(left[1])), (px(b[0]), px(b[1])), (px(right[0]), px(right[1]))], fill=rgba(color), width=px(width))

    def draw_edges(self, draw):
        for edge in self.spec.get("edges", []):
            points = self.edge_points(edge)
            self.draw_arrow(draw, points, edge.get("stroke", self.theme["dark"]), edge.get("width", 2), edge.get("arrow", True), edge.get("style") == "dashed")
            if edge.get("label"):
                mx, my = point_at_progress(rounded_route(points), 0.5)
                draw_fitted(draw, edge["label"], mx - 54, my - 24, 108, 22, 12, self.theme["muted"], min_size=8)

    def draw_scene(self):
        image = self.blank()
        draw = ImageDraw.Draw(image)
        self.draw_header(draw)
        nodes = self.spec.get("nodes", [])
        for node in [item for item in nodes if item.get("layer") == "background"]:
            self.draw_node(draw, node)
        self.draw_edges(draw)
        for node in [item for item in nodes if item.get("layer") != "background"]:
            self.draw_node(draw, node)
        return image.resize((self.canvas["width"], self.canvas["height"]), Image.Resampling.LANCZOS).convert("RGB")

    def finish_static(self, image):
        rng = random.Random(903177)
        final = image.convert("RGBA")
        width, height = final.size
        grain = Image.new("RGBA", final.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(grain)
        alpha_min = int(self.theme["grain_min"])
        alpha_max = int(self.theme["grain_max"])
        for _ in range(max(700, int(width * height * 0.001))):
            tone = rng.randrange(130, 220)
            draw.point((rng.randrange(width), rng.randrange(height)), fill=(tone, tone, tone, rng.randrange(alpha_min, max(alpha_min + 1, alpha_max))))
        final.alpha_composite(grain)
        vignette_alpha = int(self.theme["vignette"])
        if vignette_alpha:
            mask = Image.new("L", final.size, vignette_alpha)
            mask_draw = ImageDraw.Draw(mask)
            mask_draw.ellipse((-width * 0.12, -height * 0.35, width * 1.12, height * 1.18), fill=0)
            overlay = Image.new("RGBA", final.size, (0, 0, 0, 0))
            overlay.putalpha(mask.filter(ImageFilter.GaussianBlur(28)))
            final.alpha_composite(overlay)
        return final.convert("RGB")

    def animation_line(self, item):
        if "points" in item:
            return [tuple(point) for point in item["points"]]
        if "edge" in item:
            edges = self.spec.get("edges", [])
            return self.edge_points(edges[item["edge"]]) if 0 <= item["edge"] < len(edges) else []
        if "from" in item and "to" in item:
            return self.edge_points(item)
        return []

    def draw_particle(self, draw, x, y, color, strength):
        for radius, alpha in [(18, 42), (11, 88), (5, 230)]:
            draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=rgba(color, alpha * strength))
        core = self.theme.get("motion_core", self.theme["text"])
        draw.ellipse((x - 5, y - 5, x + 5, y + 5), outline=rgba(color, 230), width=2)
        draw.ellipse((x - 2, y - 2, x + 2, y + 2), fill=rgba(core, 245))

    def pulse_node(self, draw, node, progress):
        stroke, _ = self.node_colors(node)
        x, y, w, h = node["x"], node["y"], node["w"], node["h"]
        alpha = 105 + 95 * (0.5 + 0.5 * math.sin(progress * math.tau * 2))
        fill_alpha = 18 + 18 * (0.5 + 0.5 * math.sin(progress * math.tau * 2))
        if node.get("type") == "diamond":
            center = (x + w / 2, y + h / 2)
            base_points = [(center[0], y), (x + w, center[1]), (center[0], y + h), (x, center[1])]
            for growth, line_width, scale_alpha in [(0, 4, 1.0), (8, 4, 0.78), (17, 3, 0.48), (28, 2, 0.25)]:
                points = []
                for px0, py0 in base_points:
                    dx = px0 - center[0]
                    dy = py0 - center[1]
                    length = math.hypot(dx, dy) or 1
                    points.append((px0 + growth * dx / length, py0 + growth * dy / length))
                if growth == 0:
                    draw.polygon(points, fill=rgba(stroke, fill_alpha))
                draw.line(points + [points[0]], fill=rgba(stroke, alpha * scale_alpha), width=line_width)
            return
        draw.rounded_rectangle((x, y, x + w, y + h), radius=18, fill=rgba(stroke, fill_alpha))
        for growth, line_width, scale_alpha in [(0, 4, 1.0), (7, 4, 0.78), (16, 3, 0.46), (28, 2, 0.22)]:
            draw.rounded_rectangle(
                (x - growth, y - growth, x + w + growth, y + h + growth),
                radius=18 + growth,
                outline=rgba(stroke, max(18, alpha * scale_alpha)),
                width=line_width,
            )

    def frame(self, base, index, total):
        frame = base.convert("RGBA")
        overlay = Image.new("RGBA", frame.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        animation = self.spec.get("animation", {})
        motion = animation.get("motion_color") or animation.get("motion") or self.theme["motion"]
        paths = animation.get("paths")
        if paths is None:
            paths = [{"edge": idx} for idx, _ in enumerate(self.spec.get("edges", []))]
        progress = index / max(1, total)
        for offset, item in enumerate(paths):
            points = self.animation_line(item)
            if len(points) < 2:
                continue
            points = rounded_route(points)
            for tail, strength in [(0, 1.0), (-0.04, 0.66), (-0.08, 0.36)]:
                x, y = point_at_progress(points, progress + offset * 0.13 + tail)
                self.draw_particle(draw, x, y, motion, strength)
        pulse_ids = [node_id for node_id in animation.get("pulses", []) if node_id in self.nodes]
        if pulse_ids:
            active = pulse_ids[(index // 7) % len(pulse_ids)]
            self.pulse_node(draw, self.nodes[active], progress)
        frame.alpha_composite(overlay)
        return frame.convert("RGB")

    def write(self, outdir, basename):
        outdir.mkdir(parents=True, exist_ok=True)
        static = self.finish_static(self.draw_scene())
        png_path = outdir / f"{basename}.png"
        gif_path = outdir / f"{basename}.gif"
        static.save(png_path, "PNG")
        count = int(self.canvas["frames"])
        fps = int(self.canvas["fps"])
        frames = [self.frame(static, idx, count) for idx in range(count)]
        frames[0].save(gif_path, save_all=True, append_images=frames[1:], duration=int(1000 / fps), loop=0, optimize=False)
        return {"png": str(png_path), "gif": str(gif_path)}


def gif_motion_report(gif_path):
    with Image.open(gif_path) as gif:
        picks = [0, max(1, gif.n_frames // 3), max(2, gif.n_frames * 2 // 3), gif.n_frames - 1]
        frames = []
        for index in picks:
            gif.seek(index)
            frames.append(gif.convert("RGB"))
        frame_count = gif.n_frames
    diffs = []
    for first, second, a, b in zip(frames, frames[1:], picks, picks[1:]):
        delta = ImageChops.difference(first, second)
        box = delta.getbbox()
        changed = 0
        if box:
            crop = delta.crop(box)
            pixels = crop.get_flattened_data() if hasattr(crop, "get_flattened_data") else crop.getdata()
            for pixel in pixels:
                if pixel != (0, 0, 0):
                    changed += 1
        diffs.append({"from": a, "to": b, "changed_pixels": changed})
    return {"frames": frame_count, "diffs": diffs}


def validate_outputs(result, spec):
    canvas = {**DEFAULT_CANVAS, **spec.get("canvas", {})}
    png_path = Path(result["png"])
    gif_path = Path(result["gif"])
    checks = [{"name": "png_exists", "ok": png_path.is_file()}, {"name": "gif_exists", "ok": gif_path.is_file()}]
    if png_path.is_file():
        with Image.open(png_path) as png:
            checks.extend(
                [
                    {"name": "png_width", "ok": png.width == canvas["width"], "expected": canvas["width"], "actual": png.width},
                    {"name": "png_height", "ok": png.height == canvas["height"], "expected": canvas["height"], "actual": png.height},
                ]
            )
    if gif_path.is_file():
        with Image.open(gif_path) as gif:
            checks.extend(
                [
                    {"name": "gif_width", "ok": gif.width == canvas["width"], "expected": canvas["width"], "actual": gif.width},
                    {"name": "gif_height", "ok": gif.height == canvas["height"], "expected": canvas["height"], "actual": gif.height},
                    {"name": "gif_frames", "ok": gif.n_frames == canvas["frames"], "expected": canvas["frames"], "actual": gif.n_frames},
                ]
            )
        motion = gif_motion_report(gif_path)
        checks.append({"name": "gif_has_motion", "ok": any(item["changed_pixels"] > 0 for item in motion["diffs"]), "diffs": motion["diffs"]})
    return {"ok": all(item["ok"] for item in checks), "checks": checks}


def main():
    parser = argparse.ArgumentParser(description="Render an animated flow GIF from a JSON spec.")
    parser.add_argument("--spec", required=True, help="Path to a JSON diagram spec.")
    parser.add_argument("--outdir", required=True, help="Directory for generated PNG and GIF files.")
    parser.add_argument("--basename", default="flow-diagram", help="Output filename prefix.")
    parser.add_argument("--verify", action="store_true", help="Print sampled GIF frame differences.")
    parser.add_argument("--check", action="store_true", help="Validate output files and fail on broken output.")
    args = parser.parse_args()

    spec = json.loads(Path(args.spec).read_text(encoding="utf-8"))
    renderer = FlowGifRenderer(spec)
    result = renderer.write(Path(args.outdir), args.basename)
    if args.verify:
        result["verification"] = gif_motion_report(result["gif"])
    if args.check:
        result["checks"] = validate_outputs(result, spec)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    if args.check and not result["checks"]["ok"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
