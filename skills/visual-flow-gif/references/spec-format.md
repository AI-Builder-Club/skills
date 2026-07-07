# Visual Flow GIF Spec Format

Use this when writing a JSON spec for `scripts/render_animated_gif.py`.

## Top-Level Fields

```json
{
  "canvas": {},
  "theme": {},
  "title": {},
  "nodes": [],
  "edges": [],
  "animation": {}
}
```

## Canvas

```json
{
  "canvas": {
    "width": 1360,
    "height": 900,
    "fps": 20,
    "frames": 41
  }
}
```

## Theme

The default example uses the `light` theme. Use the dark preset only when a
user asks for a dark version.

```json
{
  "theme": {
    "name": "light"
  }
}
```

The shorthand string form also works:

```json
{
  "theme": "light"
}
```

Supported presets:

- `dark`
- `light`

You can still override individual colors. Preset selection and overrides can be
combined:

```json
{
  "theme": {
    "name": "light",
    "blue": "#2f6eb5",
    "motion_color": "#00b864"
  }
}
```

## Title

```json
{
  "title": {
    "text": "Support Ops",
    "highlight": "Signal Loop",
    "subtitle": "Turn repeated tickets into product action without losing context"
  }
}
```

## Nodes

Each node needs an `id`, position, size, and label.

```json
{
  "id": "triage",
  "type": "box",
  "label": "Triage",
  "body": "Group repeats\nCheck history\nPick owner",
  "x": 60,
  "y": 150,
  "w": 300,
  "h": 150,
  "color": "green"
}
```

Supported node types:

- `box`
- `diamond`
- `note`
- `label`

Supported color names:

- `blue`
- `green`
- `purple`
- `red`
- `dark`

You can also pass hex colors in `stroke` and `fill`.

Optional typography fields:

- `label_size`: title font size inside the node
- `body_size`: body font size inside the node
- `label_h`: reserved title area height before body text starts
- `label_bold`: whether the node label should receive the default faux-bold pass

For `type: "label"` nodes, these fields are also supported:

- `size`: label font size
- `bold`: whether to render with the faux-bold pass
- `fill`: text color override
- `align`: `left`, `center`, or `right`

Use these for dense small cards so titles and body copy do not overlap.

Use `layer: "background"` for large section containers that should render
behind arrows and foreground nodes.

```json
{
  "id": "core-bg",
  "type": "box",
  "layer": "background",
  "label": "Support Loop",
  "body": "(respond, log, act)",
  "x": 50,
  "y": 260,
  "w": 1180,
  "h": 310,
  "color": "blue"
}
```

## Edges

Edges can connect nodes by id:

```json
{
  "from": "triage",
  "to": "memory",
  "label": "log"
}
```

Or use a custom path:

```json
{
  "points": [[360, 225], [520, 280], [580, 340]],
  "label": "writes evidence"
}
```

Use custom paths when arrow direction or routing must match a reference image.
Custom paths with three or more points use rounded corners by default.

Optional edge fields:

- `label`: short edge label
- `stroke`: line color override
- `width`: line width
- `style`: use `"dashed"` for dashed lines
- `arrow`: set to `false` to hide the arrowhead

## Animation

The GIF animation is an overlay on top of the static diagram.

```json
{
  "animation": {
    "motion_color": "#0077ff",
    "paths": [
      { "points": [[360, 225], [520, 280], [580, 340]] },
      { "edge": 0 }
    ],
    "pulses": ["inbox", "triage", "memory"]
  }
}
```

`paths` controls moving glow dots.

`pulses` controls which nodes get active highlights. Pulse highlights are strong by default. Boxes receive rounded rectangular halos, and diamonds receive diamond-shaped halos.

For light output, use a higher-contrast motion color such as `#0077ff`. For dark output, green motion colors such as `#2cff8f` work well.

## Copy Length Guidance

- Main title: 2 to 5 words
- Highlight phrase: 1 to 3 words
- Subtitle: 1 short sentence
- Node label: 1 to 3 words
- Node body: 1 to 4 short lines
- Edge label: 1 to 3 words

Short labels make better GIFs.
