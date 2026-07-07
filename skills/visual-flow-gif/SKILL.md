---
name: visual-flow-gif
description: Create animated flow diagrams from articles, workflow notes, architecture sketches, or process descriptions using a JSON specification and a local Python/Pillow renderer. Use when the user wants to turn source material into a static PNG + animated GIF diagram.
user_invocable: true
---

# Visual Flow GIF

Use this skill when a user wants to turn source material into a clear animated flow diagram.

The output should include:

- A static PNG diagram.
- An animated GIF with visible motion.
- The JSON spec used to render the diagram when useful for later edits.

## Workflow

1. Read the source material and identify the system.
   - Inputs, outputs, actors, modules, tools, stores, and feedback loops.
   - Main steps, decision points, shared artifacts, and arrow direction.
   - Any visual constraints from a reference image.

2. Create a JSON spec.
   - Start from `${CLAUDE_PLUGIN_ROOT}/skills/visual-flow-gif/assets/default-spec.json` for the default light theme.
   - Start from `${CLAUDE_PLUGIN_ROOT}/skills/visual-flow-gif/assets/dark-spec.json` only when the user asks for a dark version.
   - Use short English labels unless the user asks for another language.
   - Use explicit `x`, `y`, `w`, and `h` values for predictable layout.
   - Use custom multi-point paths for routed arrows. Corners are rounded by default.
   - Add important modules to `animation.pulses`; pulse highlights are strong by default.
   - See `${CLAUDE_PLUGIN_ROOT}/skills/visual-flow-gif/references/spec-format.md` for field details.

3. Render the diagram.

   Requires Python 3.10+ and Pillow 10+. If Pillow is missing, install it first:
   `python3 -m pip install -r ${CLAUDE_PLUGIN_ROOT}/skills/visual-flow-gif/requirements.txt`

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/visual-flow-gif/scripts/render_animated_gif.py \
  --spec /path/to/spec.json \
  --outdir /path/to/output \
  --basename diagram \
  --verify \
  --check
```

4. Inspect the PNG and GIF before delivery.
   - Text is readable and not clipped.
   - Labels and arrows do not overlap important content.
   - Arrow directions match the source material.
   - The GIF has visible motion.
   - Pulse highlights are clearly visible in both light and dark modes.
   - The full system fits inside the frame.

## Style Guide

- Prefer a clean technical diagram with a lightweight editorial feel.
- Use the light theme by default.
- Use the dark theme only when the user asks for a dark version.
- Prefer Excalifont when available; the renderer falls back automatically.
- Keep important labels bold enough to scan quickly.
- Use rounded routed arrows instead of hard right-angle turns.
- Use color to separate roles:
  - Blue for core process areas.
  - Green for active loops, tools, memory, or operational panels.
  - Purple for shared layers, archives, or internal systems.
  - Red for friction, risk, warnings, or signals.
- Keep node labels short and concrete.
- Do not invent structure, metrics, claims, or arrow direction that is not present in the source.

## Quality Bar

Always run with `--verify --check` before delivery.

`--verify` prints sampled frame differences so the GIF animation can be confirmed.

`--check` validates that:

- PNG and GIF files exist.
- Output dimensions match the spec.
- GIF frame count matches the spec.
- Sampled frames contain visible motion.
