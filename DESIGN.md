# DESIGN.md

Rules for UI and visual design.

## Typography
- Always use Manrope or Inter. Never any other font.
- Font weights allowed: Light, Regular, Medium.
- Semi-bold used rarely, only for small emphasis (a label). Never on a stat.
- Never Bold or any heavy weight.
- Numbers never use Manrope. Use Inter for numeric text.
- Never use font weight alone to create hierarchy. Use size and color first.

## Color
- I give a primary color, optionally with a secondary. From each, generate a full Tailwind-style palette: shades 50 through 900.
- One accent color per project. No competing accent colors on the same screen.
- Text color comes from a fixed set (e.g. primary, secondary, muted). Never a one-off gray picked by eye.
- Background and text always meet WCAG AA contrast, no exceptions.

## Spacing
- Use a fixed spacing scale (e.g. 4, 8, 12, 16, 24, 32, 48, 64). Never an arbitrary pixel value.
- Consistent spacing between sections. Don't let one section breathe more than another without reason.

## Layout
- One primary action per screen. Everything else is secondary.
- Max content width on large screens. Text never stretches edge to edge on desktop.
- Mobile is designed first, not scaled down from desktop after the fact.

## Components
- Reuse existing components before creating a new variant.
- Buttons, inputs, and cards follow one consistent style across the whole product. No per-page one-offs.
- Icons come from a single icon set. Never mix icon styles.

## Motion
- Animations are short (150 to 250ms). Nothing lingers.
- Motion has a purpose (feedback, direction, state change). Never decorative motion with no function.

## Consistency
- Same component looks and behaves the same everywhere it appears.
- No inline styles overriding the design system for a "quick fix."
