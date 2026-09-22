# Design system, dark mode, motion and secure login

## Outcome

- Consolidate the app’s colors, typography, spacing, radii, shadows and motion into reusable semantic tokens.
- Add a high-contrast dark theme that starts from the device preference and can be changed from the post-login header.
- Refine the post-login header and navigation for desktop and mobile, preserving permissions and existing destinations.
- Add restrained transitions to shared controls, loading states, menus and modal windows, respecting reduced-motion preferences.
- Animate the login background lines and require Cloudflare Turnstile before authentication.

## Implementation

1. Rework global design tokens for light and dark themes, including surface levels, overlays, typography scale, spacing rhythm and motion timing/easing.
2. Add a theme provider and accessible header control that persists the user’s choice while supporting the initial system preference.
3. Make the authenticated navigation adaptive: full grouped navigation on larger screens and a compact menu on smaller screens, with consistent focus, hover and active states.
4. Standardize shared components most used across the app: buttons, inputs, text areas, selects, cards, badges, tables, skeletons, menus, dialogs, alerts and drawers.
5. Apply Motion only at shared interaction boundaries, avoiding large page-wide animation costs and disabling movement when reduced motion is requested.
6. Enhance the existing login mesh with slow layered line movement and restrained depth.
7. Add the Turnstile widget on login and a server-side verification function. Authentication proceeds only after Cloudflare validates the token; tokens are reset after failed attempts.
8. Validate desktop and mobile layouts, theme switching, keyboard focus, login states, modal motion and build health.

## Required configuration

- Store the Cloudflare Turnstile site key and secret key in protected project configuration. The site key is used by the login widget; the secret key is read only by the server verifier.
- Until valid keys are configured, the login will show a clear configuration message rather than silently bypassing captcha.

## Scope safeguards

- Keep existing colors and brand identity, permissions, pages and business rules.
- Do not alter database data or access rules.
- Preserve reduced-motion accessibility and avoid heavy continuous animation.
