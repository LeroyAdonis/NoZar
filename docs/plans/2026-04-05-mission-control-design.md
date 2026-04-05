      | 3`): 1× tablet (`1024×768`), 1× phone (`375×812`) | Stack of iPhone/Android boxes. |
| Sipho | Fixer | Terminal (`top`, `htop`, `grep`) | Wrench on wall. Debug console screen. `"/fix"` sticker. |

**Implementation Notes:**
- **Depth Sorting:** Monitors render above desks, chairs below
- **Animation:** Subtle breath animation (scale 1→1.02→1) on status change
- **Click Zones:**
  - Desk: View agent profile
  - Monitor: Deep link to active task (if applicable)

---

### 5.2 Meeting Rooms (`Imbizo`, `Lekgotla`)
**Structure:**
- 2×2 grid tiles
- Glass walls (`Glass Tint` fill) with `Backface Visibility: hidden`
- Round table (`Umber` wood grain)
- Whiteboard (`Deep Ebony` background, `Ochre` border)
- **"In Use" Indicator:**
  - **Idle:** Dim blue (`Sky Blue 30%`) halo around door frame
  - **Occupied:** Bright blue halo + pulsing icon (`👥`) above door

**Interior:**
```ascii
   DOOR
     |
+--------+--------+
| 🛋️  🛋️  🛋️  |
|        Table     |
| 💻  📊  📋   |
+--------+--------+
| Whiteboard      |
| [Miro board]    |
+-----------------+
```

**Whiteboard Content:**
- `Imbizo`: Rotating project roadmap
- `Lekgotla`: Sticky notes from recent meetings

**Implementation Notes:**
- **Glass Refraction:** Apply GLSL fragment shader for subtle distortion
- **Double-Click:** Zoom camera to fill view with room

---

### 5.3 Break Room
**Structure:**
- 2×3 grid tiles
- **North Wall:**
  ```ascii
  +---------------------+
  | ☕                |
  | COFFEE MACHINE     |
  | Last brew: 9:42    |
  +--------+----------+
  | 🧊                |
  | FRIDGE            |
  +---------------------+
  ```
- **West Wall:** Couch (`Umber` leather texture), throw blanket (`Protea Pink`)
- **Floor:** Hexagonal tiles (`Deep Ebony`/`Umber` checkerboard)

**Animated Elements:**
- Coffee machine steam (continuous, low opacity)
- Agent avatars lounging (idle agents spawn here)
- **Social Feature:** Click couch to spawn toast notification: `+Naledi joined break`

---

### 5.4 Kanban Wall
**Structure:**
- 4×2 grid tiles (physical corkboard)
- **Columns:** Physical tape strips (`Springbok Gold`) with printed labels

```ascii
+--------+--------+--------+--------+
| BACKLOG| READY  | IN     | REVIEW | DONE  |
|        |        | PROGRESS|        |       |
+--------+--------+--------+--------+
| [T1]   | [T4]   | [T7]   | [T9]   | 🔒    |
| [T2]   | [T5]   | [T8]   |        | 🔒    |
| [T3]   | [T6]   |        |        | 🔒    |
+--------+--------+--------+--------+
```

**Ticket Design:** Vertical A6 cards (`120×80px`)

```
+---------------------+
| 🔴 NoZar Auth       |
| [avatar] Kofi 🔨    |
|                     |
| ☕ 2h | 📅 Jun 10  |
+---------------------+
```

| Status | Color | Icon |
|--------|-------|------|
| Blocked | `Signal Red` | 🚧 |
| High   | `Springbok Gold` | ⚠️ |
| Medium | `Spekboom Green` | 🎯 |
| Low    | `Sky Blue` | 📝 |

**Interaction:**
- Drag tickets between columns → trigger status update
- Hover: Show full task description + link to ticket
- Click: Deep link to ticket
- **Physics:** Tickets slightly sway when moved

---

### 5.5 Project Monitors
**Structure:** Wall-mounted 4K screens (16:9, `2×1` tiles each)

```ascii
+--------+ +--------+ +--------+ +--------+
| NoZar  | | Aliento| | DWT    | | PGS    |
|  🟢     | |   🟡     | |   🔴     | |   🟢     |
| 2d ago | | 1w ago | | 3h ago | | 5h ago |
+--------+ +--------+ +--------+ +--------+
```

| Status | Color | Icon | Last Deploy |
|--------|-------|------|--------------|
| Healthy | `Spekboom Green` | 🟢 | `<time> ago` |
| Warning | `Springbok Gold` | 🟡 | `<time> ago` |
| Error   | `Signal Red` | 🔴 | `<time> ago` |

**Content:** Real-time CI/CD dashboard pull (`/api/project-status`)

---

### 5.6 Chat Console
**Structure:** `2×2` grid tiles, physical terminal aesthetic

```ascii
+---------------------+
| > _                  |
|                     |
| Broadcast?: [yes]   |
|                     |
| [Naledi 🎨]         |
| Task redesign       |
| 14:22               |
+---------------------+
```

**Input Field:** Futuristic but tactile (glass panel look)
- Prompt: `> ` (animated cursor `|`)
- **Broadcast Toggle:** `📢` icon — yellow when enabled
- **Send Animation:** Message "floats" into chat feed

**Chat Feed:** Max 5 visible messages
- **Format:** `[agent emoji+role] message`
- **Styling:** Agent accent colors with subtle glow

---

## 6. Animation & Motion
**Principles:**
- **Purposeful:** Motion = information
- **Warm:** Easing = `ease-out-expo` (soft landings)
- **Cultural:** SA-inspired rhythm (staccato pulses, not uniform)

**Preset Animations:** (duration in ms)

| Name | Trigger | Animation | Duration |
|------|---------|-----------|----------|
| Pop | Task/completed | Scale 0.8→1.1→1 | 300 |
| Wobble | Drag drop | X-axis rotation (±5°) | 400 |
| Breathe | Idle agents | Scale 1→1.02→1 | 3000 |
| Pulse | Urgent (meeting/block) | Opacity 1→0.7→1 | 1500 |
| Slide-in | New chats/tasks | Translate X 100%→0% | 200 |
| Shimmer | Background | Soft directional gradient shift | Continuous |

---

## 7. Responsive Tiers
### 7.1 Desktop (`≥1200px viewport`)
- **Layout:** Full isometric office
- **Zoom:** Min 80%, Max 200%
- **Interaction:** Drag pan, wheel zoom, hover tooltips

### 7.2 Tablet (`600px–1199px`)
- **Layout:** Centered office, limited pan area
- **Zoom:** Min 60%, Max 150%
- **Interaction:** Touch pan/zoom, tap for tooltips
- **Simplified:** Break room details hidden

### 7.3 Mobile (`<600px`)
- **Layout:** Vertical slice (Kanban Wall + 2 desks + Chat)
- **Zoom:** Locked (100%)
- **Interaction:** Swipe pan, double-tap deep link
- **Simplified:** Agent cards = `80×40px`, no desk details

---

## 8. Implementation Tokens
**CSS Custom Properties** (for Kofi)

```css
:root {
  /* Palette */
  --color-deep-ebony: #1E1512;
  --color-deep-ebony-light: #2A1E18;
  --color-deep-ebony-dark: #120D0A;
  --color-umber: #4A3D32;
  --color-umber-light: #5C4A3A;
  --color-ochre: #B8956A;
  --color-protea-pink: #D495B0;
  --color-spekboom-green: #6F8A68;
  --color-springbok-gold: #B8A052;
  --color-signal-red: #D45252;
  --color-sky-blue: #7FB8D4;

  /* Depth */
  --depth-floor: 0;
  --depth-desk: 1;
  --depth-monitor: 2;
  --depth-agent-card: 3;
  --depth-ui-overlay: 10;

  /* Spacing */
  --grid-tile-size: 64px;
  --base-spacing: 8px;

  /* Typography */
  --font-primary: 'Saira', system-ui, -apple-system;
  --font-mono: 'JetBrains Mono', monospace;
  --base-font-size: 16px;
}
```

**Design Tokens** (JSON)

```json
{
  "grid": {
    "tileSize": 64,
    "angle": 30,
    "rows": 8,
    "cols": 12
  },
  "agents": {
    "kofi": {
      "monitorCount": 3,
      "decor": ["sticky-note", "lager-can", "code-book"]
    },
    "naledi": {
      "monitorCount": 1,
      "decor": ["mood-board", "color-swatches"]
    }
  },
  "breakRoom": {
    "animatedSteam": true,
    "agentCap": 4
  }
}
```

---

## 9. Accessibility & Edge Cases
**WCAG 2.1 AA Compliance:**
- **Contrast:** All status colors ≥4.5:1 against `Deep Ebony`
- **Focus:** Visible focus rings (`Ochre` glow)
- **Reduced Motion:** Respect `prefers-reduced-motion` → disable all animations

**Edge Cases:**
| Scenario | Solution |
|----------|----------|
| 20 agents | Overflow room beyond visible grid |
| Zero tasks | Kanban Wall shows `:)` face draw in Sharpie |
| Meeting max | `Imbizo` meeting shows `FULL` badge |
| Dark mode OS | Auto-detect via `prefers-color-scheme` |
| High latency | Skeleton loaders for project monitors |

---

## 10. Appendix: Agent Personality Mood Boards

**Kofi**
```
[Sticky notes] [Code editor glow] 
[Century City Lager can] [Yellow legal pad]
```

**Zuri**
```
[White desk] [MacBook-like monitor]
[KOFFIE cup] [Minimalist stand]
```

**Naledi**
```
[Mood board with SA textiles]
[Color swatches pinned]
[Sketchbook with isometric thumbnails]
```

---

## 11. Next Steps
1. Kofi 🔨 builds pixel-faithful front-end from spec
2. Thabo 🔍 QA tests across breakpoints + dark mode
3. Sipho 🔧 integrates real data hooks (`/api/project-status`, `/api/agent-status`)
4. Naledi 🎨 refines animation curves post-implementation