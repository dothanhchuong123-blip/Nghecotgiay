# Mix Rules: Blending Traditional Vietnamese Garments with Modern Streetwear (v1 · 2026-09-30)

> **Document Status:** Active / Verified
> **Approval Date:** 2026-09-30 (Approved by owner)
> **Target Systems:** Engine validation pipeline, styling recommendation checks, and Nghê's interactive dialogue assistant.

---

## 1. Core Philosophy & Architectural Intent

* **The Core Philosophy:** A modern piece may join the garment; it may **never** hide what makes it that garment.
* **Strictness Policy (Decision 3B):**
* By default, broken style rules are tolerated rather than halted: the styling engine allows the combination to exist, while Nghê delivers a single, considerate advisory line detailing the exact mechanical correction.
* Only hard integrity violations (**R7** and **R8**) trigger hard enforcement (`block`). Under a blocking state, the component cannot be attached, or the preview visual is invalidated and redrawn.


* **Severity Mapping Matrix:**
* `block` $\rightarrow$ **High Severity**: Hard execution halt; component addition rejected / generation refused.
* `warn` $\rightarrow$ **Medium Severity**: Permitted with feedback; triggers a real-time contextual warning and recommended fix.
* `note` $\rightarrow$ **Low Severity**: Soft recommendation; stylistic or historical observation without penalizing viability.



---

## 2. Structural & Silhouette Rules (`Shape`)

| ID | Rule Specification | Severity | Target Subsystems |
| --- | --- | --- | --- |
| **R1** | **Signature Visible:** Under no circumstance may a modern element obscure, conceal, or replace any anatomical zone designated in the garment's `must_show` manifest (see Reference Matrix below). | `warn` | `engine`, `prompt`, `check` |
| **R2** | **The Garment is the Biggest Thing:**<br>

<br>• **Level 1 (Subtle Accent):** Exactly `0` modern garments, or `1` auxiliary item restricted to footwear, hand-carried accessories, or minor headwear.<br>

<br>• **Level 2 (Single Hero):** Exactly `1` modern "hero" piece (+ optional footwear).<br>

<br>• **Level 3 (Max Contrast Fusion):** Up to `3` modern pieces, provided the garment's projected surface area remains strictly greater than the cumulative visible area of all modern items combined (measured via doll-canvas coverage metric `E2`). | `warn` | `engine` |
| **R3** | **Long with Short, or Long with Long:** Long-silhouette garments (*áo*) must be matched either with a cropped/short structural layer (e.g., bomber jackets, cropped outerwear, open cardigans) or an elongated coat that matches its vertical cadence (e.g., *măng tô* overcoats). Mid-length, bulky outerwear terminating mid-panel (*mid-tà*) is strictly invalid. | `warn` | `engine`, `prompt` |
| **R4** | **Modern Goes Under, or Open on Top:**<br>

<br>• Modern foundation layers worn beneath must reveal themselves strictly at the neckline/collar.<br>

<br>• Outer layers worn above the garment must remain fully unfastened/open.<br>

<br>• Never tuck the panels (*tà*).<br>

<br>• Outer layers are prohibited over wide sleeves (*tay thụng*). | `warn`<br>

<br>*(Wide sleeve / tay thụng: preserve legacy system conflict behavior)* | `engine`, `prompt`, `check` |
| **R5** | **Swap the Bottom Only Where the Line Survives:** Wide-leg denim or tailored straight-leg trousers may substitute for traditional silk pants. Skirts are compatible strictly with *tứ thân* or *bà ba*. Pairing an *áo dài* with culottes triggers a warning (NTK Đức Hùng precedent). Ceremonial robes governed by **R6** are strictly barred from lower-body substitutions. | `warn` | `engine` |
| **R6** | **Ceremony Robes Stay Near the Ceremony:** Regalia and formal ceremonial attires—*Nhật Bình*, *áo tấc*, *áo viên lĩnh*, *áo giao lĩnh*, and *áo the*—are restricted strictly to Levels 1–2; all street graphics and casual graphic prints are barred. Everyday and versatile staples—*áo dài*, *ngũ thân*, *tứ thân*, and *bà ba*—support the full spectrum (Levels 1–3). | `warn`<br>

<br>*(Level 3 configuration is programmatically withheld for ceremonial types)* | `engine`, `presets` |
| **R7** | **No Borrowed Identity Marks:** Absolute ban on foreign ethnic identifiers and non-indigenous motifs: Chinese knot/frog buttons (*cúc tàu*), Qipao mandarin collars, Hanfu/Kimono sashes (*obi*), Hanbok tie-ribbons (*goreum*), imperial dragon roundels, and traditional sea-wave hem borders. | `block` | `prompt`, `check` |
| **R8** | **Respect the Place and the Body:**<br>

<br>• **Sacred & Solemn Spaces:** Shoulders must remain fully covered; hats/caps removed; exposed midriffs prohibited.<br>

<br>• **Bodily Dignity:** Never leave buttons unfastened or garments open to display underwear. | `block`<br>

<br>*(Sacred space + cap/croptop; unbuttoned open-front)* | `engine`, `prompt`, `check` |

---

## 3. Garment Structural Signatures (`must_show`)

* **Anatomical Target Zones:**
* `collar`: Neckline structure, band height, and fold geometry.
* `closure`: Fastener configuration, button lines, and overlapping plackets.
* `sleeves`: Sleeve silhouette, taper, cuffs, and volume.
* `ta`: Elongated floating front and back panels.
* `hem`: Bottom terminal edge, length profile, and slits.
* `waist`: Beltline, wrapping zone, or cinch points.
* `inner`: Mandatory visible foundational inner layers.
*(Definitions extracted from `structure` metadata within `web/src/data/kb.ts`)*



### Signature Matrix

| Garment Identifier | Mandatory Visible Signature Zones (`must_show`) | Allowed Levels |
| --- | --- | --- |
| `ao-dai` | `collar` (standing collar), `ta` (dual long floating panels split from natural waist), `sleeves` (fitted/narrow profile) | 1–3 |
| `ao-ngu-than` | `collar` (standing collar displaying white inner collar band), `closure` (five-button diagonal placket fastening to the right flank), `hem` (loose profile extending past knees) | 1–3 |
| `ao-tu-than` | `closure` (unfastened, flowing open front panels), `inner` (*yếm* bodice visible), `waist` (tied silk sash) | 1–3 |
| `ao-ba-ba` | `collar` (collarless scoop/slit), `closure` (centered vertical button line), `hem` (hip-length profile with side slits and dual patch pockets) | 1–3 |
| `ao-the` | `collar` (standing collar), `closure` (five-button right-side placket), `inner` (opaque white *áo* layer visible beneath sheer outer gauze) | 1–2 |
| `ao-giao-linh` | `collar` (overlapping "Y-shape" crossed collar), `waist` (fabric sash closure), `sleeves` (expansive, wide cut) | 1–2 |
| `ao-tac` | `collar` (standing collar), `sleeves` (wide ceremonial sleeves extending past fingertips), `hem` (sweeping, loose-fitting full length) | 1–2 |
| `ao-vien-linh` | `collar` (rounded neckline securing at the right shoulder), `hem` (ankle-length drop) | 1–2 |
| `ao-nhat-binh` | `collar` (prominent rectangular embroidered chest panel), `sleeves` (wide sleeves finished with five-color bands), `hem` (heel-length profile) | 1–2 |

### Layering Collision & Occlusion Rules

* Every modern component declares a spatial coverage array `covers: Zone[]` reflecting how it sits on the figure:
* Open outerwear covers `sleeves` and partial `ta`; it may never cover `collar` or `closure`.
* Zipped/buttoned hoodies cover `collar`, `closure`, and `sleeves`.
* Foundation t-shirts worn underneath cover no external garment zones (`[]`).
* Belts cover `waist`.
* Trousers or skirt replacements leave upper-garment *áo* zones fully unobstructed (`[]`).


* **Crossed-Collar Orientation Directive:** The overlap direction for crossed collars must follow the canonical historical record documented in the Knowledge Base (Trần Quang Đức, *Ngàn năm áo mũ*). Conflicting internet discussions do not override this primary source.

---

## 4. Chromatic Harmony Rules (`Colour`)

* **Color Space Standards:** Hue angle, chroma, and perceptual lightness are evaluated using the **OKLCH** color model rather than HSL (Standard `E3`). OKLCH eliminates perceptual distortions between yellow and blue lightness values. Runtime fabric simulation (`src/art/photo.ts`) runs natively on OKLab transforms.

| ID | Rule Specification | Target Subsystems |
| --- | --- | --- |
| **C1** | **60 · 30 · 10 (Garment-Led Balance):** Outfit surface distribution must follow the classic golden ratio: Traditional Garment $\approx 60\%$ in primary dominant tone; Modern Elements $\approx 30\%$ in restrained secondary neutrals (denim indigo, earthy tones, carbon ink, natural ivory); Signature Accent $\approx 10\%$ pop color. Ratios are calculated using actual doll area projections (`E2`), never flat color counts. | `engine` |
| **C2** | **Mớ Ba Principle (Dark Shell, Radiant Lining):** When the dominant exterior tone is deep/muted ($L < 40$ in OKLCH coordinates; e.g., deep mud/nâu sồng, natural indigo/chàm, midnight violet/tím than, carbon/đen), secondary color accents must migrate to visible boundary edges: collar trims, cuffs, sash cords, or inner layered collars (soft canary yellow/vàng mỡ gà, lotus pink/hồng sen, peach petal/hồng đào, lake cyan/xanh hồ thuỷ). Applying this configuration grants an outfit score bonus, with Nghê explicitly identifying the technique. | `engine`, `prompt`, `chat` |
| **C3** | **Đông Hồ Five Core Palette:** Safe, fail-safe palette based on folk woodblock prints: Cinnabar Red (*son*, `#B4302B`), Sophora Yellow (*hoè*, `#E2B93B`), Indigo Green-Blue (*chàm*, `#2F6D6A`), Scallop Shell White (*điệp*, `#F3EDE0`), and Charcoal Carbon (*than*, `#1B1A17`) (anchored to nearest KB color values). Pairing any two passes validation automatically. High-visibility fluorescent/neon hues are permitted only in Level 3, and strictly as the $10\%$ focal accent. | `engine` |
| **C4** | **One Loud Thing:** Only one high-chroma, saturated visual focal point is permitted per ensemble: a vivid traditional garment calls for quiet, muted modern pairings; an eye-catching modern piece requires a quiet, neutral traditional base. Pair muted tones with muted tones. | `engine` |
| **C5** | **Cultural Color Semantics & Situational Etiquette:**<br>

<br>• **Auspicious Occasions (Tết, Weddings, Longevity Celebrations):** Reds, yellows, and warm pinks denote joy and vitality.<br>

<br>• **Mourning Colors:** Pure whites, stark blacks, dull blue-greens, and somber purples were historically associated with grief and mourning rituals. Head-to-toe monochromatic white or high-contrast black-and-white worn to weddings or Tết triggers an advisory `note` (the standard white student *áo dài* remains fully exempt).<br>

<br>• **Sacred Shrines & Pagodas:** Respectful earthy browns, deep indigos, and muted dark palettes are encouraged; flashy ensembles trigger an advisory `note`.<br>

<br>• **Ceremonial Robes:** Saturated imperial yellow applied to formal regalia evokes sovereign status and triggers an explanatory `note`. | `engine`<br>

<br>*(Integrated via existing `occasion_notes`)*,<br>

<br>`chat` |
| **C6** | **Five Elements (*Ngũ Hành*) as Narrative Only:** The Five Elements system serves purely as cultural storytelling and educational context; it never alters or biases the quantitative outfit score. Matches current engine behavior. | `engine`, `chat` |

---

## 5. Bibliography & Source Documentation

* **VietNamNet:** *The Tết 2026 Áo Dài Debate* (Featuring Trung Đinh: Silhouette structure and tailoring construction as cultural identity; critique of frog buttons):
[https://vietnamnet.vn/tranh-cai-ve-ao-dai-tet-ranh-gioi-mong-manh-giua-cach-tan-va-xam-lan-van-hoa-2486770.html](https://www.google.com/search?q=https://vietnamnet.vn/tranh-cai-ve-ao-dai-tet-ranh-giua-cach-tan-va-xam-lan-van-hoa-2486770.html)
* **VOV (Voice of Vietnam):** *"Modernized Áo Dài: Creativity Within Cultural Boundaries"* (Featuring ThS. Bùi Thị Kim Phương; Designer Đức Hùng):
[https://vov.gov.vn/ao-dai-cach-tan-sang-tao-nhung-phai-co-chung-muc-dtnew-184863](https://vov.gov.vn/ao-dai-cach-tan-sang-tao-nhung-phai-co-chung-muc-dtnew-184863)
* **Dân Trí:** *Analysis and Criticism of the 2025 Plunging/Open-Chest Áo Dài Variations*:
[https://dantri.com.vn/giai-tri/ao-dai-cach-tan-xe-nguc-vi-sao-sang-tao-lai-bi-cong-dong-nem-da-20251225091015721.htm](https://dantri.com.vn/giai-tri/ao-dai-cach-tan-xe-nguc-vi-sao-sang-tao-lai-bi-cong-dong-nem-da-20251225091015721.htm)
* **Thể thao & Văn hoá:** *The Layering Aesthetics of Historical Áo Mớ Ba Mớ Bảy*:
[https://thethaovanhoa.vn/quan-ao-mo-bay-mo-ba-thoi-xua-20120513033913573.htm](https://thethaovanhoa.vn/quan-ao-mo-bay-mo-ba-thoi-xua-20120513033913573.htm)
* **VUSTA:** *Traditional Costumes and Garments of Vietnamese Women Across History*:
[https://vusta.vn/trang-phuc-phu-nu-xua-p74661.html](https://vusta.vn/trang-phuc-phu-nu-xua-p74661.html)
* **State Commission for Overseas Vietnamese (`scov.gov.vn`):** *Color Symbolism in Traditional Vietnamese Culture*:
[https://scov.gov.vn/ban-sac-van-hoa/tu-dien-van-hoa/mau-sac-voi-truyen-thong-van-hoa-dan-toc.html](https://scov.gov.vn/ban-sac-van-hoa/tu-dien-van-hoa/mau-sac-voi-truyen-thong-van-hoa-dan-toc.html)
* **Artnam & Department of Cultural Heritage (`dsvh.gov.vn`):** *Natural Pigments and Chromatic Philosophy in Đông Hồ Folk Art*:
[https://artnam.vn/mau-sac-trong-tranh-dan-gian-dong-ho/](https://artnam.vn/mau-sac-trong-tranh-dan-gian-dong-ho/) · [https://dsvh.gov.vn/tranh-dan-gian-dong-ho-3151](https://dsvh.gov.vn/tranh-dan-gian-dong-ho-3151)
* **Soko Glam:** *Preserving Core Identity: Modern Korean Hanbok, Collar Retention, and Goreum Form*:
[https://sokoglam.com/blogs/theklog/modern-korean-fashion-hanbok](https://sokoglam.com/blogs/theklog/modern-korean-fashion-hanbok)
* **Japan Today:** *Styling Kimono with Streetwear Sneakers (Osaka Trend Analysis)*:
[https://japantoday.com/category/features/lifestyle/kimono-with-sneakers-why-not-says-osaka-fashion-retailer](https://japantoday.com/category/features/lifestyle/kimono-with-sneakers-why-not-says-osaka-fashion-retailer)
* **Inside Out Style Blog:** *Practical Application of the 60-30-10 Color Rule in Daily Ensembles*:
[https://insideoutstyleblog.com/2019/03/using-the-60-30-10-rule-to-create-fabulous-colour-combinations-in-your-outfits.html](https://insideoutstyleblog.com/2019/03/using-the-60-30-10-rule-to-create-fabulous-colour-combinations-in-your-outfits.html)

---

## 6. System Pipeline Operations & Knowledge Base Integration

* Any newly identified historical facts derived from these references (such as the *mớ ba* layering techniques or cultural color semantics) must be registered in `kb.ts` under a validated `SOURCES` entry.
* New entries must carry an initial flag of `verified: false` until explicitly reviewed and approved by the project owner in accordance with the protocol established in `AGENT-RULES.md` (*Section: Facts and culture*).