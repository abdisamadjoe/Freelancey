# Gigly color system ("Calm Mint")

## Core palette
| Role    | Name         | HEX      | RGB          | Use |
|---------|--------------|----------|--------------|-----|
| Primary | Forest Green | #064E3B  | 6, 78, 59    | Wordmark, main shapes, headings, primary buttons, app icon background |
| Accent  | Mint         | #10B981  | 16, 185, 129 | The one moving part: dots, highlights, active states, progress, status. Decorative only. |
| Light   | Mint Mist    | #ECFDF5  | 236, 253, 245| Page and panel backgrounds, reversed wordmark on dark |

## Supporting neutrals
| Token       | HEX      | Use |
|-------------|----------|-----|
| ink         | #111827  | Body text on light |
| muted       | #6B7280  | Secondary text, captions |
| line        | #E5E7EB  | Borders, dividers |
| surface     | #FFFFFF  | Cards, inputs |
| surface-tint| #EEF3F1  | Soft panels (primary at 7%) |

## Tints (toward white)
| Step | Primary | Accent  |
|------|---------|---------|
| 100  | #064E3B | #10B981 |
| 80   | #387162 | #40C79A |
| 60   | #6A9589 | #70D5B3 |
| 40   | #9BB8B1 | #9FE3CD |
| 20   | #CDDCD8 | #CFF1E6 |

## CSS variables
```css
:root {
  --color-primary: #064E3B;
  --color-accent: #10B981;
  --color-light: #ECFDF5;
  --color-ink: #111827;
  --color-muted: #6B7280;
  --color-line: #E5E7EB;
  --color-surface: #FFFFFF;
  --color-surface-tint: #EEF3F1;
  --color-primary-80: #387162;
  --color-primary-60: #6A9589;
  --color-primary-40: #9BB8B1;
  --color-primary-20: #CDDCD8;
  --color-accent-80: #40C79A;
  --color-accent-60: #70D5B3;
  --color-accent-40: #9FE3CD;
  --color-accent-20: #CFF1E6;
}
```

## Tailwind
```js
colors: {
  primary: { DEFAULT: '#064E3B', 80: '#387162', 60: '#6A9589', 40: '#9BB8B1', 20: '#CDDCD8' },
  accent:  { DEFAULT: '#10B981', 80: '#40C79A', 60: '#70D5B3', 40: '#9FE3CD', 20: '#CFF1E6' },
  light: '#ECFDF5',
  ink: '#111827', muted: '#6B7280', line: '#E5E7EB',
}
```

## Proportions
Light/white 60%, Primary 30%, Accent 10%.

## Pairings (contrast)
| Foreground | Background | Ratio | Verdict |
|------------|------------|-------|---------|
| Primary    | White      | 9.7:1 | AAA, use for text |
| Primary    | Light      | 9.2:1 | AAA, use for text |
| Light      | Primary    | 9.2:1 | AAA, reversed text |
| Accent     | Primary    | 3.8:1 | Graphics and large text only |
| Accent     | White      | 2.5:1 | Fails. Never for text or thin icons; dots and fills only |
| Accent     | Light      | 2.4:1 | Fails. Same rule |

## Rules
- Text is Primary or ink on light backgrounds, Light on Primary. Never Accent text on white or Light.
- Accent is one small element per view (dot, badge, progress, toggle). A button filled with Accent needs Primary text (not white).
- Buttons: filled Primary with Light text; secondary is a 2px Primary outline.
- Dark surfaces use Primary as the background, not black. On dark, Accent keeps its value.
- No gradients, no extra hues. Status colors (error, warning) may be added but stay out of the brand surfaces.
- Typography: Manrope SemiBold (600) for the wordmark and headings, Regular 400 for body. Open license.
