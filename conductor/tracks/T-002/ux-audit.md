# UX Audit Findings
Last updated: 2026-01-27

Source: full UI scan (TSX + CSS).

## Findings (by file)
- src/index.css:2088 - Focus indicators removed for buttons/links (no visible keyboard focus).
- src/index.css:158 - Multiple interactive controls below 44px touch size.
- src/index.css:296 - Headings lack text-wrap balancing (awkward wraps).

- src/AdminApp.tsx:2049 - Clickable table rows are divs without keyboard semantics.
- src/AdminApp.tsx:2667 - Drag reorder is pointer-only; no keyboard path.
- src/AdminApp.tsx:1907 - Inputs missing name; non-auth inputs missing autocomplete="off"; email missing spellCheck={false}.
- src/AdminApp.tsx:1892 - Status/placeholder copy uses "..." instead of ellipsis (…).

- src/pages/HomePage.tsx:468 - Sort select not labeled (span is not associated).
- src/pages/HomePage.tsx:422 - Search input missing name.
- src/pages/HomePage.tsx:507 - Game cards use button for navigation; should be Link/a.
- src/pages/HomePage.tsx:440 - Images lack width/height attributes.
- src/pages/HomePage.tsx:52 - Placeholder copy uses "..." instead of ellipsis (…).

- src/components/ShellLayout.tsx:116 - Decorative menu icon missing width/height and aria-hidden.
- src/components/ShellLayout.tsx:149 - Theme icon missing width/height.

- src/pages/GameSetupPage.tsx:540 - Navigation uses button for route change; should be Link.
- src/pages/GameSetupPage.tsx:503 - Loading text uses "..." instead of ellipsis (…).

- src/pages/profile/AuthForm.tsx:108 - Inputs missing name attributes.
- src/pages/profile/AuthForm.tsx:119 - Email input missing spellCheck={false}.
- src/pages/profile/AuthForm.tsx:146 - "Sending..." should be "Sending…".
- src/pages/profile/AuthForm.tsx:151 - "Working..." should be "Working…".

- src/pages/profile/RecoveryForm.tsx:39 - Inputs missing name attributes.
- src/pages/profile/RecoveryForm.tsx:66 - "Saving..." should be "Saving…".
- src/pages/profile/RecoveryForm.tsx:32 - Heading not Title Case ("Reset password").

- src/pages/profile/ProfileSettings.tsx:44 - Inputs missing name attributes.
- src/pages/profile/ProfileSettings.tsx:38 - Loading/placeholder copy uses "..." or no ellipsis.
- src/pages/profile/ProfileSettings.tsx:70 - "Saving..." should be "Saving…".

- src/pages/profile/DangerZone.tsx:25 - "Deleting..." should be "Deleting…".

- src/pages/ProfilePage.tsx:454 - "Checking session..." should be "Checking session…".

- src/main.tsx:61 - "Loading admin console..." should be "Loading admin console…".

## Improvement plan (desktop + mobile)
1) Accessibility + interaction consistency: restore visible focus styles, convert clickable divs to buttons/links (or add role+tabIndex+key handlers), ensure label + name + proper autocomplete/spellCheck, and use Link for navigation.
2) Mobile ergonomics: ensure all tap targets are >=44px on small screens (nav/theme/sort toggles, small buttons, icon controls).
3) Consistency + stability: standardize copy style (ellipses, Title Case or agreed sentence case), add text-wrap balance for headings, set width/height on icons and cover images.
