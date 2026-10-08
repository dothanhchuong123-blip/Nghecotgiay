

# Build Rules: Read Before Every Step

Every prompt starts with `"Read docs/BUILD-RULES.md"`. Follow all of it, every time.

---

## 1. Scope & Execution Boundary

* **Step-Bound Execution:** Do **only** the step specified in the prompt. Do not add pages, tabs, menus, quizzes, sliders, buttons, sounds, or features not explicitly named in the step.
* **Propose, Don't Build:** If you think something is missing or needs improvement, state it explicitly in your reply; do **not** build or scaffold it.
* **Target Files Only:** Only create or modify the exact files named in the step. If you must touch another file to maintain functionality, explicitly declare which file and explain why before doing so.
* **File Protection:** Never rename, move, or delete any file you did not create during this specific step.

---

## 2. Assets & Data Isolation (`public/` & `src/data/`)

* **Strict Read-Only:** Never create, edit, overwrite, rename, or delete anything inside `public/` or `src/data/`.
* **No Stand-in Art / Generators:** Never generate mock/placeholder graphics (SVG, canvas, CSS art, emoji) to substitute for assets in `public/`. Never write scripts to generate visual assets.
* **Missing Asset Handling:** If an image fails to load or does not exist, render nothing in its place and log `[art missing] <path>` directly to the browser console.
* **Asset Pathing:** Reference images strictly by their absolute root path (e.g., `/popcard/ao-giao-linh/back.webp`). Asset paths must start with `/`, never with `public/`.
* **Single Source of Truth for Data:** All garment lists, colors, pieces, timelines, and citations must come strictly from `src/data/*.json`. Never hardcode any of these lists into code or components.

---

## 3. Localization, Copy & Cultural Knowledge

* **Strict Vietnamese Copy:** Every word displayed on screen must be in Vietnamese and sourced directly, word-for-word, from `src/data/copy-giay.json` or `src/data/kb.json`. Never author Vietnamese or English UI text yourself.
* **Missing Strings:** If a UI string is missing from the data files, render nothing on screen and report the missing key/string in your reply.
* **Dev Mode Exception:** Developer inspection pages (`?dev=…`) are permitted to use plain English.
* **Zero Cultural Invention:** Never write cultural or historical claims, summaries, or sentences yourself—neither in the UI, code comments, nor prompts passed to Gemini. All historical facts must come strictly from `kb.json`.

---

## 4. Code Architecture & Technical Standards

* **Framework & Structure:** React + TypeScript. Strictly one component per file, placed inside the exact directory specified by the step.
* **CSS & Design Tokens:**
* Write plain CSS inside the `.css` file specified by the step, utilizing design variables defined in `src/styles/tokens.css`.
* Do **not** introduce Tailwind classes into new code.
* Do **not** use inline `style` attributes, except strictly for values computed at runtime (e.g., dynamic transforms, CSS custom properties, calculated positions).


* **Dependencies:** Do not install or import new npm packages unless explicitly instructed in the step. Use the `motion` package only if the step demands it.
* **Accessibility & Reduced Motion:**
* Every animation must fully respect `prefers-reduced-motion: reduce` or the `?reduced=1` URL parameter.
* When reduced motion is active, disable all movement: state changes must appear immediately or fade in within 150 ms or less.
* Every draggable interaction must provide an equivalent tap path and full keyboard navigation.
* Visible focus outlines are mandatory at all times (`2px` `--son` outline with `2px` offset).



---

## 5. Visual Language & Rendering

* **Aesthetic Theme:** Cut paper and pop-up book aesthetic: Dó paper pages, kraft board, cinnabar red tabs, and fine ink linework. Align with mockups in `docs/mockups/` when specified.
* **Paper Shadows & Elevation:**
* **Paper Thickness:** Apply a hard shadow `0 3px 0 rgba(42,33,27,.18)` under every paper element.
* **Elevation:** Lifted pieces receive an additional soft shadow.
* **Lying Book ("Gặp áo"):** Standing elements cast a blurred shadow directly onto the page, and the book casts a shadow onto the desk, strictly as specified in the step.
* **Forbidden Styles:** No other shadows, no button gradients, no glassmorphism, no backdrop blur filters, and no neon colors.


* **3D Mechanics:**
* The book utilizes genuine 3D via CSS `perspective`, `rotateX`, and `transform-style: preserve-3d`.
* **Preserve 3D Context:** Never apply `overflow: hidden` or an `opacity` less than `1` to the book container or any of its ancestors, as both properties flatten the 3D rendering context.
* All positioning values on the book must originate from `src/data/stage.json`.


* **Typography:**
* Headings: `"Bricolage Grotesque"`.
* Body & General UI: `"Be Vietnam Pro"`.
* Forbidden: Never use system serif fonts.



---

## 5b. Paper-Engineering Principles (Mandatory for Every Spread)

The book must function like a physical mechanical pop-up book. If any step contradicts these constraints, halt immediately and report it:

* **P1. Fold-Flat Geometry:** Every component must fold completely flat when the book closes. Standing elements must be engineered as V-folds, boxes, or easels with glue tabs. They rise strictly as a function of the page opening angle (driven by page rotation), never triggered by independent timers.
* **P2. Slotted Mechanics:** Moving components must travel inside cut slots with physical stops at both ends. Pull-tabs must extend past the page perimeter and feature a printed directional arrow.
* **P3. Hinged Flaps:** Flaps must hinge along a scored fold on a single edge and are mechanically limited to lifting at most ~160°.
* **P4. Volvelle Wheels:** Rotating wheels must pivot on a brass split pin and reveal contents through cut viewing windows.
* **P5. Structural Support:** No element may float in space; every elevated piece must rest on a visible kraft paper strut.
* **P6. Material Thickness:** Every paper cutout must possess visual thickness via a thin white cut edge and a hard shadow (blurred shadows are reserved solely for cast shadows defined in Section 5).

---

## 6. Required Reply Protocol (End of Every Step)

Every response must conclude with these three items:

1. **File Manifest:** List of all files created and files modified (full relative paths).
2. **Blockers & Scope Warnings:** Explicit details on anything from the step that could not be executed, along with the technical justification.
3. **Integrity Confirmation:** The exact confirmation string: `"No file in public/ or src/data/ was changed."`