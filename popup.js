// OptiNote — popup.js
// GDPR-safe: no external data transmission except Groq API (user-configured)

'use strict';

// ── State ──────────────────────────────────────────────────
let icd10Data = null;
let selectedCodes = [];
let currentCondition = 'DR';
let toggleState = {};  // { group: value }

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadIcd10Data();
  loadSettings();
  initTabs();
  initConditionChips();
  initToggleButtons();
  initTemplates();
  initIcd10();
  initSoap();
  initSettings();
});

// ── Load ICD-10 data ───────────────────────────────────────
async function loadIcd10Data() {
  try {
    const res = await fetch(chrome.runtime.getURL('data/icd10_ophthalmic.json'));
    icd10Data = await res.json();
  } catch (e) {
    console.error('Failed to load ICD-10 data:', e);
  }
}

// ── Load saved settings ────────────────────────────────────
function loadSettings() {
  chrome.storage.local.get(['groqApiKey', 'clinicianName', 'department'], (data) => {
    if (data.groqApiKey) document.getElementById('groqApiKey').value = data.groqApiKey;
    if (data.clinicianName) document.getElementById('clinicianName').value = data.clinicianName;
    if (data.department) document.getElementById('department').value = data.department;
  });
}

// ── Tab switching ──────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => {
        p.classList.add('hidden');
        p.classList.remove('active');
      });
      btn.classList.add('active');
      const panel = document.getElementById('tab-' + btn.dataset.tab);
      panel.classList.remove('hidden');
      panel.classList.add('active');
    });
  });
}

// ── Condition chips ────────────────────────────────────────
function initConditionChips() {
  document.querySelectorAll('.condition-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.condition-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentCondition = chip.dataset.condition;

      // Show correct form
      document.querySelectorAll('.template-form').forEach(f => f.classList.add('hidden'));
      const form = document.getElementById('form-' + currentCondition);
      if (form) form.classList.remove('hidden');

      // Reset toggle state for new condition
      toggleState = {};
      // Re-init toggles to reflect defaults
      document.querySelectorAll('#form-' + currentCondition + ' .toggle-btn').forEach(btn => {
        if (btn.classList.contains('active')) {
          toggleState[btn.dataset.group] = btn.dataset.value;
        }
      });

      // Hide output
      document.getElementById('templateOutput').classList.add('hidden');
    });
  });

  // Init default toggle state for DR
  document.querySelectorAll('#form-DR .toggle-btn.active').forEach(btn => {
    toggleState[btn.dataset.group] = btn.dataset.value;
  });
}

// ── Toggle buttons ─────────────────────────────────────────
function initToggleButtons() {
  document.addEventListener('click', (e) => {
    if (!e.target.matches('.toggle-btn')) return;
    const btn = e.target;
    const group = btn.dataset.group;
    const value = btn.dataset.value;

    // Only toggle within same form context
    const form = btn.closest('.template-form, .tab-panel');
    if (form) {
      form.querySelectorAll(`.toggle-btn[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
    }
    btn.classList.add('active');
    toggleState[group] = value;
  });
}

// ── Template generation ────────────────────────────────────
function initTemplates() {
  document.getElementById('generateNoteBtn').addEventListener('click', generateNote);
  document.getElementById('clearTemplateBtn').addEventListener('click', clearTemplate);
  document.getElementById('copyTemplateBtn').addEventListener('click', () => {
    copyToClipboard(document.getElementById('templateText').textContent, document.getElementById('copyTemplateBtn'));
  });
}

function getFormValues(formId) {
  const form = document.getElementById(formId);
  if (!form) return {};
  const values = {};
  form.querySelectorAll('[data-field]').forEach(el => {
    values[el.dataset.field] = el.value.trim();
  });
  return values;
}

function generateNote() {
  const condition = currentCondition;
  const form = getFormValues('form-' + condition);
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  
  chrome.storage.local.get(['clinicianName', 'department'], (settings) => {
    let note = '';
    const clinician = settings.clinicianName || '';
    const dept = settings.department || '';
    const header = [
      `Date: ${date}`,
      form.patient_ref ? `Patient ref: ${form.patient_ref}` : '',
      clinician ? `Clinician: ${clinician}` : '',
      dept ? `Department: ${dept}` : '',
    ].filter(Boolean).join('\n');

    switch (condition) {
      case 'DR':
        note = buildDRNote(form, header);
        break;
      case 'AMD':
        note = buildAMDNote(form, header);
        break;
      case 'Glaucoma':
        note = buildGlaucomaNote(form, header);
        break;
      case 'ROP':
        note = buildROPNote(form, header);
        break;
      case 'Cataract':
        note = buildCataractNote(form, header);
        break;
    }

    const output = document.getElementById('templateOutput');
    document.getElementById('templateText').textContent = note;
    output.classList.remove('hidden');
  });
}

function buildDRNote(f, header) {
  const eye = toggleState.eye || 'BE';
  const grade = toggleState.dr_grade || 'No DR';
  const maculo = toggleState.maculopathy || 'No DMO';
  const eyeLabel = eye === 'BE' ? 'both eyes' : eye === 'R' ? 'right eye' : 'left eye';

  return `DIABETIC RETINOPATHY — CLINICAL NOTE
${'─'.repeat(42)}
${header}

FINDINGS
Eye(s): ${eyeLabel}
DR Grade: ${grade}
Maculopathy: ${maculo}
${f.va ? `Visual Acuity (LogMAR): ${f.va}` : ''}
${f.hba1c ? `HbA1c: ${f.hba1c}` : ''}
${f.notes ? `\nObservations:\n${f.notes}` : ''}

IMPRESSION
${grade === 'No DR' ? 'No diabetic retinopathy detected.' : `${grade} identified in ${eyeLabel}.`}
${maculo !== 'No DMO' ? `${maculo} present — consider referral to medical retina.` : ''}

PLAN
${grade === 'No DR' ? '• Annual routine diabetic eye screening' : ''}
${grade === 'Mild NPDR' ? '• Annual review; optimise glycaemic and blood pressure control' : ''}
${grade === 'Moderate NPDR' ? '• 6-monthly review; refer to ophthalmology if progressing' : ''}
${grade === 'Severe NPDR' ? '• Urgent ophthalmology referral within 4 weeks' : ''}
${grade === 'PDR' ? '• Urgent ophthalmology referral within 1 week; laser/anti-VEGF to be discussed' : ''}
${maculo === 'CSMO' ? '• Refer for intravitreal anti-VEGF treatment' : ''}
`.trim();
}

function buildAMDNote(f, header) {
  const eye = toggleState.eye || 'BE';
  const type = toggleState.amd_type || 'Dry AMD';
  const stage = toggleState.amd_stage || 'Early';
  const antivegf = toggleState.antivegf || 'None';
  const eyeLabel = eye === 'BE' ? 'both eyes' : eye === 'R' ? 'right eye' : 'left eye';

  return `AGE-RELATED MACULAR DEGENERATION — CLINICAL NOTE
${'─'.repeat(52)}
${header}

FINDINGS
Eye(s): ${eyeLabel}
AMD Type: ${type}
Stage: ${stage}
Visual Acuity (LogMAR): ${f.va || 'Not recorded'}
Current anti-VEGF: ${antivegf}
${f.oct ? `\nOCT Findings:\n${f.oct}` : ''}

IMPRESSION
${stage} ${type} — ${eyeLabel}.

PLAN
${type === 'Wet AMD' && antivegf === 'None' ? '• Initiate anti-VEGF therapy — urgent referral to medical retina' : ''}
${type === 'Wet AMD' && antivegf !== 'None' ? `• Continue ${antivegf} treatment; monitor OCT at next visit` : ''}
${type === 'Dry AMD' && stage === 'Intermediate' ? '• Consider AREDS2 supplements; advise Amsler grid self-monitoring' : ''}
${type === 'Dry AMD' && stage === 'Early' ? '• Annual review; low vision aids if symptomatic' : ''}
${type === 'Geographic atrophy' ? '• Discuss emerging therapies; low vision support referral' : ''}
• Patient counselled on monitoring for new symptoms (metamorphopsia, new central scotoma)
`.trim();
}

function buildGlaucomaNote(f, header) {
  const eye = toggleState.eye || 'BE';
  const type = toggleState.glaucoma_type || 'POAG';
  const vf = toggleState.vf_status || 'Normal';
  const eyeLabel = eye === 'BE' ? 'both eyes' : eye === 'R' ? 'right eye' : 'left eye';
  const iopLine = (f.iop_r || f.iop_l) ? `IOP: R ${f.iop_r || '—'} / L ${f.iop_l || '—'} mmHg` : '';
  const cdrLine = (f.cdr_r || f.cdr_l) ? `CDR: R ${f.cdr_r || '—'} / L ${f.cdr_l || '—'}` : '';

  return `GLAUCOMA — CLINICAL NOTE
${'─'.repeat(42)}
${header}

FINDINGS
Eye(s): ${eyeLabel}
Diagnosis: ${type}
${iopLine}
${cdrLine}
Visual Field: ${vf}
${f.drops ? `Current topical therapy: ${f.drops}` : ''}

IMPRESSION
${type} — ${eyeLabel}. VF: ${vf}.

PLAN
${vf === 'Normal' && type === 'OHT' ? '• Observe; repeat VF and IOP in 12 months' : ''}
${type === 'POAG' && vf === 'Mild loss' ? '• Continue current drops; repeat HRT/OCT in 6 months' : ''}
${type === 'POAG' && (vf === 'Moderate loss' || vf === 'Severe loss') ? '• Review treatment escalation; consider surgery referral' : ''}
${type === 'PACG' ? '• Consider laser peripheral iridotomy; review angle anatomy' : ''}
• Next appointment in ${vf === 'Normal' ? '12' : vf === 'Mild loss' ? '6' : '3'} months
`.trim();
}

function buildROPNote(f, header) {
  const eye = toggleState.eye || 'BE';
  const stage = toggleState.rop_stage || 'Stage 1';
  const zone = toggleState.rop_zone || 'Zone II';
  const plus = toggleState.plus || 'No plus disease';
  const eyeLabel = eye === 'BE' ? 'both eyes' : eye === 'R' ? 'right eye' : 'left eye';
  const stageNum = parseInt(stage.replace('Stage ', '')) || 0;
  const needsTreatment = stageNum >= 3 || plus === 'Plus disease';

  return `RETINOPATHY OF PREMATURITY — CLINICAL NOTE
${'─'.repeat(48)}
${header}

INFANT DETAILS
${f.gest_age ? `Gestational age at birth: ${f.gest_age}` : ''}
${f.pma ? `PMA at examination: ${f.pma}` : ''}

FINDINGS
Eye(s): ${eyeLabel}
ROP Stage: ${stage}
Zone: ${zone}
Plus disease: ${plus}

IMPRESSION
ROP ${stage}, ${zone}${plus !== 'No plus disease' ? `, with ${plus.toLowerCase()}` : ''} — ${eyeLabel}.

PLAN
${!needsTreatment ? '• No treatment required at present; continue weekly screening' : ''}
${stageNum === 3 && zone === 'Zone I' ? '• TYPE 1 ROP — treat within 48–72 hours (laser/anti-VEGF)' : ''}
${stageNum === 3 && zone === 'Zone II' ? '• Review in 3 days; treat if plus disease develops' : ''}
${stageNum >= 4 ? '• URGENT surgical referral — consider vitreoretinal surgery' : ''}
${plus === 'Plus disease' ? '• Treat within 48–72 hours — plus disease threshold reached' : ''}
• Parents counselled on diagnosis and follow-up importance
`.trim();
}

function buildCataractNote(f, header) {
  const eye = toggleState.eye || 'R';
  const type = toggleState.cat_type || 'Nuclear';
  const grade = toggleState.cat_grade || 'Grade 2';
  const eyeLabel = eye === 'R' ? 'right eye' : 'left eye';
  const gradeNum = parseInt(grade.replace('Grade ', '')) || 2;
  const surgical = gradeNum >= 3;

  return `CATARACT — CLINICAL NOTE
${'─'.repeat(42)}
${header}

FINDINGS
Eye: ${eyeLabel}
Cataract type: ${type}
Grade (LOCS): ${grade}
VA Snellen: ${f.va_snellen || 'Not recorded'}
VA LogMAR: ${f.va_logmar || 'Not recorded'}
${f.symptoms ? `\nSymptoms reported:\n${f.symptoms}` : ''}

IMPRESSION
${type} cataract, ${grade} — ${eyeLabel}.

PLAN
${!surgical ? '• Conservative management; annual review' : ''}
${surgical ? '• Surgical referral for phacoemulsification + IOL' : ''}
${surgical ? '• Pre-operative biometry (IOL Master) requested' : ''}
${surgical ? '• Patient counselled on surgical risks and visual outcomes' : ''}
${!surgical ? '• Consider referral if symptoms worsen or VA drops below 6/18' : ''}
`.trim();
}

function clearTemplate() {
  const form = document.getElementById('form-' + currentCondition);
  if (form) {
    form.querySelectorAll('input, textarea').forEach(el => el.value = '');
  }
  document.getElementById('templateOutput').classList.add('hidden');
}

// ── ICD-10 Search ──────────────────────────────────────────
function initIcd10() {
  document.getElementById('icd10SearchBtn').addEventListener('click', searchIcd10);
  document.getElementById('icd10Search').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchIcd10();
  });
  document.getElementById('copyCodesBtn').addEventListener('click', copySelectedCodes);

  document.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sym = btn.dataset.symptom;
      document.getElementById('icd10Search').value = sym;
      searchIcd10(sym);
    });
  });
}

function searchIcd10(queryOverride) {
  if (!icd10Data) return;

  const rawQuery = typeof queryOverride === 'string'
    ? queryOverride
    : document.getElementById('icd10Search').value.trim();
  const query = rawQuery.toLowerCase();
  const results = [];

  // Check direct condition match
  for (const [condName, codes] of Object.entries(icd10Data.conditions)) {
    if (condName.toLowerCase().includes(query) || query.includes(condName.toLowerCase())) {
      codes.forEach(item => results.push({ ...item, condition: condName }));
    }
  }

  // Check symptom match
  for (const [symptom, codes] of Object.entries(icd10Data.symptoms)) {
    if (symptom.includes(query) || query.includes(symptom) ||
        symptom.split(' ').some(w => query.includes(w) && w.length > 3)) {
      codes.forEach(item => {
        if (!results.find(r => r.code === item.code)) {
          results.push(item);
        }
      });
    }
  }

  renderIcd10Results(results, rawQuery);
}

function renderIcd10Results(results, query) {
  const container = document.getElementById('icd10Results');
  container.innerHTML = '';

  if (!results.length) {
    container.innerHTML = `<div class="no-results">No results for "${query}" — try a different symptom or condition name</div>`;
    return;
  }

  results.slice(0, 12).forEach(item => {
    const el = document.createElement('div');
    el.className = 'icd-result-item';
    if (selectedCodes.find(c => c.code === item.code)) el.classList.add('selected');
    el.innerHTML = `
      <span class="icd-code">${item.code}</span>
      <span class="icd-desc">${item.description}</span>
      <span class="icd-cond">${item.condition}</span>
      <button class="icd-add-btn" title="Add to selection">+</button>
    `;
    el.querySelector('.icd-add-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      addSelectedCode(item);
      el.classList.add('selected');
    });
    el.addEventListener('click', () => {
      addSelectedCode(item);
      el.classList.add('selected');
    });
    container.appendChild(el);
  });
}

function addSelectedCode(item) {
  if (selectedCodes.find(c => c.code === item.code)) return;
  selectedCodes.push(item);
  renderSelectedCodes();
}

function renderSelectedCodes() {
  const list = document.getElementById('selectedCodesList');
  list.innerHTML = '';
  if (!selectedCodes.length) {
    list.innerHTML = '<span style="color:var(--text-light);font-size:11px;">Click codes above to add them here</span>';
    return;
  }
  selectedCodes.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'selected-code-tag';
    el.innerHTML = `
      <span class="icd-code">${item.code}</span>
      <span style="font-size:12px;color:var(--text)">${item.description}</span>
      <button class="remove-code" title="Remove">×</button>
    `;
    el.querySelector('.remove-code').addEventListener('click', () => {
      selectedCodes.splice(i, 1);
      renderSelectedCodes();
      // deselect in results
      document.querySelectorAll('.icd-result-item').forEach(el => {
        const codeEl = el.querySelector('.icd-code');
        if (codeEl && codeEl.textContent === item.code) el.classList.remove('selected');
      });
    });
    list.appendChild(el);
  });
}

function copySelectedCodes() {
  if (!selectedCodes.length) return;
  const text = selectedCodes.map(c => `${c.code} — ${c.description}`).join('\n');
  copyToClipboard(text, document.getElementById('copyCodesBtn'));
}

// ── SOAP Formatter ─────────────────────────────────────────
function initSoap() {
  document.getElementById('formatSoapBtn').addEventListener('click', formatSoap);
  document.getElementById('clearSoapBtn').addEventListener('click', () => {
    document.getElementById('soapInput').value = '';
    document.getElementById('soapOutput').classList.add('hidden');
  });
  document.getElementById('copySoapBtn').addEventListener('click', () => {
    copyToClipboard(document.getElementById('soapText').textContent, document.getElementById('copySoapBtn'));
  });
}

async function formatSoap() {
  const input = document.getElementById('soapInput').value.trim();
  if (!input) {
    showSoapError('Please enter some clinical notes to format.');
    return;
  }

  const apiKey = document.getElementById('groqApiKey').value.trim() ||
    (await new Promise(res => chrome.storage.local.get('groqApiKey', d => res(d.groqApiKey || ''))));

  if (!apiKey) {
    showSoapError('Groq API key required. Go to ⚙ Settings to add your key (free at console.groq.com).');
    return;
  }

  const context = toggleState.soap_context || 'General ophthalmology';

  const loading = document.getElementById('soapLoading');
  const output = document.getElementById('soapOutput');
  const btn = document.getElementById('formatSoapBtn');

  loading.classList.remove('hidden');
  output.classList.add('hidden');
  btn.disabled = true;

  try {
    const systemPrompt = `You are a specialist ophthalmic clinical documentation assistant. 
Convert free-text clinical notes into a structured SOAP note format for ${context}.
Use precise ophthalmic terminology. Be concise and clinical.
Format the response EXACTLY as:

SUBJECTIVE
[patient complaints, symptoms, history]

OBJECTIVE
[examination findings, measurements, test results]

ASSESSMENT
[diagnosis, clinical impression]

PLAN
[management, follow-up, referrals]

Do not add disclaimers, explanations, or anything outside the SOAP structure.`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Format this ophthalmic clinical note into SOAP format:\n\n${input}` }
        ],
        max_tokens: 600,
        temperature: 0.2
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error ${res.status}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';

    document.getElementById('soapText').textContent = text;
    output.classList.remove('hidden');
  } catch (err) {
    showSoapError(`Error: ${err.message}`);
  } finally {
    loading.classList.add('hidden');
    btn.disabled = false;
  }
}

function showSoapError(msg) {
  const output = document.getElementById('soapOutput');
  document.getElementById('soapText').textContent = '⚠ ' + msg;
  output.classList.remove('hidden');
}

// ── Settings ───────────────────────────────────────────────
function initSettings() {
  document.getElementById('settingsBtn').addEventListener('click', () => {
    loadSettings();
    document.getElementById('settingsOverlay').classList.remove('hidden');
  });
  document.getElementById('closeSettingsBtn').addEventListener('click', () => {
    document.getElementById('settingsOverlay').classList.add('hidden');
  });
  document.getElementById('settingsOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('settingsOverlay')) {
      document.getElementById('settingsOverlay').classList.add('hidden');
    }
  });
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
}

function saveSettings() {
  const key = document.getElementById('groqApiKey').value.trim();
  const name = document.getElementById('clinicianName').value.trim();
  const dept = document.getElementById('department').value.trim();

  chrome.storage.local.set({ groqApiKey: key, clinicianName: name, department: dept }, () => {
    const confirm = document.getElementById('saveConfirm');
    confirm.classList.remove('hidden');
    setTimeout(() => confirm.classList.add('hidden'), 2000);
  });
}

// ── Utility ────────────────────────────────────────────────
function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const original = btn.textContent;
    btn.textContent = '✓ Copied';
    setTimeout(() => btn.textContent = original, 1800);
  }).catch(() => {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    const original = btn.textContent;
    btn.textContent = '✓ Copied';
    setTimeout(() => btn.textContent = original, 1800);
  });
}
