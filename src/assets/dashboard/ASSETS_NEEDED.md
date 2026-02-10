# Dashboard Assets Required

Please add the following assets to the `assets/dashboard` folder to match the Figma design exactly:

## 1. Intoto Logo
- **Path:** `assets/dashboard/intoto-logo.png`
- **Description:** Square/rounded teal blue logo (placeholder currently shows #00C9DB background). Replace the `.logo-placeholder` div in dashboard.html with `<img src="assets/dashboard/intoto-logo.png" alt="Intoto" class="intoto-logo" />` when ready.
- **Dimensions:** 28x28px (or larger, will be scaled)

## 2. Ambassador Profile Images
- **Paths:** 
  - `assets/dashboard/ambassador-1.png`
  - `assets/dashboard/ambassador-2.png`
  - `assets/dashboard/ambassador-3.png`
  - `assets/dashboard/ambassador-4.png`
- **Description:** Circular profile photos for each ambassador card (120x120px display size)
- **Fallback:** Add `assets/dashboard/placeholder-avatar.png` for any missing images

## 3. Interest Icons (SVG format)
Add these icon SVGs to `assets/dashboard/icons/` folder. Each icon should be small (16x16px display size):

| Filename | Label |
|----------|-------|
| `music.svg` | Music - musical note icon |
| `travel.svg` | Travel - airplane icon |
| `photography.svg` | Photo & Videography - camera icon |
| `coding.svg` | Coding - code brackets icon |
| `gaming.svg` | Gaming - gamepad icon |
| `reading.svg` | Reading - book icon |
| `sports.svg` | Sports - sports equipment icon |
| `cooking.svg` | Cooking - chef hat icon |
| `languages.svg` | Languages - speech bubble icon |

**Note:** If icons are not added, the interest labels will still display (the icon will be hidden via onerror handler).
