# Design System

## Philosophy
Dark-first (movie-watching context). Content (video) is the visual focus — UI recedes. Rounded, soft, minimal chrome. No sharp corners anywhere.

## Color Tokens
| Token | Hex | Usage |
|---|---|---|
| `surface` | `#0f0f13` | Page background |
| `surface-raised` | `#16161d` | Cards, panels |
| `surface-overlay` | `#1e1e28` | Modals, popovers, tab active state |
| `accent` | `#7c6af7` | Primary actions, focus rings |
| `accent-dim` | `#5a4fd6` | Hover state on accent |
| `border` | `#2a2a38` | All borders |

## Typography
- **Font**: Inter (Google Fonts) — single family, no display/body split
- **Weights used**: 400 (body), 500 (labels), 600 (headings, button text)
- **Mono**: JetBrains Mono — room codes only

## Border Radius
- `rounded-xl` (1rem) — inputs, small buttons
- `rounded-2xl` (1.25rem) — tiles, dialogs
- `rounded-3xl` (1.75rem) — main cards (Home page card)

## Animation (Framer Motion)
- Page/view transitions: `opacity 0→1, y 16→0, duration 0.3s ease-out`
- Tile enter/exit: `opacity + scale 0.9→1, duration 0.2s ease-out`
- Dialog: `opacity + scale 0.95→1 + y 8→0, duration 0.18s ease-out`
- Overlay: `opacity 0→1, duration 0.18s`
- **Rule**: no idle/looping animations. Motion only on user action or state change.

## Layout
- **Desktop**: video left (flex-1) + sidebar right (w-72/w-80)
- **Mobile**: video full width, tiles stack below in a 2-col grid
- **Tile grid**: `grid-cols-2 sm:grid-cols-3` inside sidebar
- Header: sticky, minimal — logo + peer count left, room code right

## Component Decisions
| Component | Library | Notes |
|---|---|---|
| Dialog/Modal | Radix `@radix-ui/react-dialog` | ErrorDialog only |
| Buttons | Tailwind only | No Radix — simple enough |
| Inputs | Tailwind only | Consistent with button style |
| Icons | lucide-react | Consistent stroke width (default) |
| Tiles | Custom | `aspect-video`, object-cover video |
