# OptiNote — AI-powered Ophthalmic Documentation Assistant

> Built by an NHS technician who got tired of the paperwork.

OptiNote is a Chrome extension for ophthalmic clinicians. It provides structured note templates, ICD-10 mapping, and AI-powered SOAP note formatting — all with GDPR-safe local processing.

---

## Features

### 1. Template Engine
Pre-built structured note templates for the 5 most common ophthalmic conditions:
- **DR** — Diabetic Retinopathy
- **AMD** — Age-Related Macular Degeneration
- **Glaucoma** — POAG, PACG, OHT, NTG
- **ROP** — Retinopathy of Prematurity
- **Cataract** — with LOCS grading

Fill in the toggle fields → Generate → Copy to your EMR.

### 2. ICD-10 Mapper
Type a symptom or condition name and get accurate ophthalmic ICD-10 codes instantly. Includes 20+ symptoms and 5 condition groups. Build a code list and copy it all at once.

Quick-access buttons for: DR, AMD, Glaucoma, ROP, Cataract, Floaters, Red Eye, Field Loss.

### 3. SOAP Note Formatter
Paste your free-text clinical notes → Get a structured SOAP note via Groq AI (llama-3.3-70b-versatile). Specialty context options to tailor the output.

**Requires a free Groq API key** — get one at [console.groq.com](https://console.groq.com).

---

## Installation

1. Clone or download this repository
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked**
5. Select the `optinote/` folder
6. Click the OptiNote icon in your toolbar
7. Go to ⚙ Settings and add your Groq API key

---

## Privacy & GDPR

- **No patient data is transmitted externally** except when using the SOAP formatter (sent to Groq API)
- All templates and ICD-10 lookups are entirely local
- Your Groq API key is stored only in Chrome's local storage
- No analytics, no tracking, no servers

---

## File Structure

```
optinote/
├── manifest.json              # Chrome Extension MV3 config
├── popup.html                 # Main UI
├── popup.js                   # All logic
├── styles.css                 # Styling
├── data/
│   └── icd10_ophthalmic.json  # ICD-10 codes (local, offline)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## Tech Stack

- **Frontend**: HTML, CSS, Vanilla JavaScript (no frameworks)
- **ICD-10 mapping**: Static JSON lookup (offline, free, no API)
- **Note formatting**: Groq API (llama-3.3-70b-versatile)
- **Storage**: Chrome Local Storage only

---

## Roadmap (V2)

- [ ] Voice input via Web Speech API
- [ ] OCT findings structured input
- [ ] Export to PDF
- [ ] More conditions (uveitis, corneal, strabismus)
- [ ] Customisable templates

---

## Disclaimer

OptiNote is a documentation aid only. It does not provide clinical advice, diagnosis, or treatment recommendations. All clinical decisions remain the responsibility of the qualified clinician.
