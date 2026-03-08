/* ── Preset colors ──────────────────────────────────────────── */
const PRESETS = [
  // Reds
  '#FF0000', '#CC0000', '#8B0000', '#FF4444',
  // Oranges
  '#FF6600', '#FF8C00', '#FFA500', '#FF4500',
  // Yellows
  '#FFD700', '#FFE566', '#FFFF00', '#F0E68C',
  // Greens
  '#008000', '#228B22', '#00AA44', '#90EE90',
  // Teals / Cyan
  '#008080', '#20B2AA', '#00CED1', '#00FFFF',
  // Blues
  '#0000FF', '#1E90FF', '#0070C0', '#4169E1',
  // Purples
  '#800080', '#9400D3', '#8B008B', '#DA70D6',
  // Pinks
  '#FF1493', '#FF69B4', '#C71585', '#FFB6C1',
  // Browns
  '#8B4513', '#A0522D', '#D2691E', '#F4A460',
  // Neutrals
  '#000000', '#404040', '#808080', '#C0C0C0',
];

/* ── State ──────────────────────────────────────────────────── */
let fromHex = 'FF0000';
let toHex   = '008000';
let selectedFile = null;

/* ── DOM refs ───────────────────────────────────────────────── */
const dropZone   = document.getElementById('drop-zone');
const fileInput  = document.getElementById('file-input');
const fileBadge  = document.getElementById('file-badge');
const fileName   = document.getElementById('file-name');
const removeFile = document.getElementById('remove-file');
const hueSlider  = document.getElementById('hue-slider');
const hueValue   = document.getElementById('hue-value');
const huePreview = document.getElementById('hue-preview');
const satSlider  = document.getElementById('sat-slider');
const satValue   = document.getElementById('sat-value');
const processBtn = document.getElementById('process-btn');
const btnIdle    = processBtn.querySelector('.btn-idle');
const btnLoading = processBtn.querySelector('.btn-loading');
const statusEl   = document.getElementById('status');
const statusSucc = document.getElementById('status-success');
const statusErr  = document.getElementById('status-error');
const statusText = document.getElementById('status-text');
const errorText  = document.getElementById('error-text');

/* ── Colour helpers ─────────────────────────────────────────── */
function normaliseHex(str) {
  return str.replace('#', '').toUpperCase();
}

function isValidHex(str) {
  return /^#?[0-9a-fA-F]{6}$/.test(str.trim());
}

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  const n = parseInt(hex, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s, l };
}

/* ── Hue preview strip ──────────────────────────────────────── */
function updateHuePreview() {
  const { r, g, b } = hexToRgb(fromHex);
  const { h } = rgbToHsl(r, g, b);
  const tol = parseFloat(hueSlider.value);
  const steps = 32;
  const stops = [];
  for (let i = 0; i <= steps; i++) {
    const frac = i / steps;
    const hue = ((h - tol + tol * 2 * frac) % 360 + 360) % 360;
    const distFromCenter = Math.abs(frac - 0.5) * 2;
    const sat = Math.round(70 + 20 * (1 - distFromCenter));
    const lit = Math.round(50 + 8 * (1 - distFromCenter));
    stops.push(`hsl(${hue.toFixed(1)},${sat}%,${lit}%)`);
  }
  huePreview.style.background = `linear-gradient(to right,${stops.join(',')})`;
}

/* ── Custom color picker (swatch popup + native input) ───────── */
function buildSwatchGrid(gridEl, nativeEl, swatchBtn, hexInput, which) {
  PRESETS.forEach(color => {
    const btn = document.createElement('button');
    btn.className = 'swatch';
    btn.style.background = color;
    btn.title = color;
    btn.setAttribute('aria-label', color);
    btn.addEventListener('click', () => {
      applyColor(normaliseHex(color), which);
      closeAllPopups();
    });
    gridEl.appendChild(btn);
  });

  // Native color input
  nativeEl.addEventListener('input', () => {
    applyColor(normaliseHex(nativeEl.value), which);
  });
}

function applyColor(hex6, which) {
  // hex6 = 6-char uppercase hex without #
  if (which === 'from') {
    fromHex = hex6;
    document.getElementById('from-swatch').style.background = '#' + hex6;
    document.getElementById('from-hex').value = '#' + hex6;
    document.getElementById('from-native').value = '#' + hex6;
    markSelected('from-swatches', '#' + hex6);
    updateHuePreview();
  } else {
    toHex = hex6;
    document.getElementById('to-swatch').style.background = '#' + hex6;
    document.getElementById('to-hex').value = '#' + hex6;
    document.getElementById('to-native').value = '#' + hex6;
    markSelected('to-swatches', '#' + hex6);
  }
}

function markSelected(gridId, hex) {
  const grid = document.getElementById(gridId);
  grid.querySelectorAll('.swatch').forEach(s => {
    s.classList.toggle('selected', s.title.toUpperCase() === hex.toUpperCase());
  });
}

function closeAllPopups() {
  document.getElementById('from-popup').hidden = true;
  document.getElementById('to-popup').hidden = true;
}

function togglePopup(popupId) {
  const popup = document.getElementById(popupId);
  const other = popupId === 'from-popup' ? 'to-popup' : 'from-popup';
  document.getElementById(other).hidden = true;
  popup.hidden = !popup.hidden;
}

// Build grids
buildSwatchGrid(
  document.getElementById('from-swatches'),
  document.getElementById('from-native'),
  document.getElementById('from-swatch'),
  document.getElementById('from-hex'),
  'from'
);
buildSwatchGrid(
  document.getElementById('to-swatches'),
  document.getElementById('to-native'),
  document.getElementById('to-swatch'),
  document.getElementById('to-hex'),
  'to'
);

// Mark initial selections
markSelected('from-swatches', '#FF0000');
markSelected('to-swatches', '#008000');

// Swatch button toggles popup
document.getElementById('from-swatch').addEventListener('click', (e) => {
  e.stopPropagation();
  togglePopup('from-popup');
});
document.getElementById('to-swatch').addEventListener('click', (e) => {
  e.stopPropagation();
  togglePopup('to-popup');
});

// Prevent popup from closing when clicking inside it
document.getElementById('from-popup').addEventListener('click', e => e.stopPropagation());
document.getElementById('to-popup').addEventListener('click', e => e.stopPropagation());

// Close popups on outside click
document.addEventListener('click', closeAllPopups);

/* ── Hex text inputs ─────────────────────────────────────────── */
document.getElementById('from-hex').addEventListener('input', e => {
  const val = e.target.value.trim();
  if (isValidHex(val)) applyColor(normaliseHex(val), 'from');
});

document.getElementById('to-hex').addEventListener('input', e => {
  const val = e.target.value.trim();
  if (isValidHex(val)) applyColor(normaliseHex(val), 'to');
});

/* ── Sliders ─────────────────────────────────────────────────── */
function updateSliderTrack(slider) {
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.background = `linear-gradient(to right,#6366f1 ${pct}%,#e2e8f0 ${pct}%)`;
}

hueSlider.addEventListener('input', () => {
  hueValue.textContent = hueSlider.value + '°';
  updateSliderTrack(hueSlider);
  updateHuePreview();
});

satSlider.addEventListener('input', () => {
  satValue.textContent = satSlider.value + '%';
  updateSliderTrack(satSlider);
});

updateSliderTrack(hueSlider);
updateSliderTrack(satSlider);
updateHuePreview();

/* ── File handling ──────────────────────────────────────────── */
function setFile(file) {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.docx')) {
    showError('Please upload a .docx file.');
    return;
  }
  selectedFile = file;
  fileName.textContent = file.name;
  fileBadge.hidden = false;
  dropZone.classList.add('has-file');
  processBtn.disabled = false;
  clearStatus();
}

function clearFileSelection() {
  selectedFile = null;
  fileInput.value = '';
  fileBadge.hidden = true;
  dropZone.classList.remove('has-file');
  processBtn.disabled = true;
}

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) setFile(fileInput.files[0]);
});

dropZone.addEventListener('click', e => {
  if (e.target === removeFile || removeFile.contains(e.target)) return;
  if (!selectedFile) fileInput.click();
});

removeFile.addEventListener('click', e => {
  e.stopPropagation();
  clearFileSelection();
});

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', e => {
  if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('drag-over');
});
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
});

/* ── Status helpers ─────────────────────────────────────────── */
function clearStatus() {
  statusEl.hidden = true;
  statusSucc.hidden = true;
  statusErr.hidden = true;
}
function showSuccess(msg) {
  clearStatus();
  statusText.textContent = msg;
  statusSucc.hidden = false;
  statusEl.hidden = false;
}
function showError(msg) {
  clearStatus();
  errorText.textContent = msg;
  statusErr.hidden = false;
  statusEl.hidden = false;
}
function setLoading(loading) {
  processBtn.disabled = loading;
  btnIdle.hidden = loading;
  btnLoading.hidden = !loading;
}

/* ── Submit ─────────────────────────────────────────────────── */
processBtn.addEventListener('click', async () => {
  if (!selectedFile) return;
  clearStatus();
  setLoading(true);

  const formData = new FormData();
  formData.append('file', selectedFile);
  formData.append('from_color', fromHex);
  formData.append('to_color', toHex);
  formData.append('hue_tolerance', hueSlider.value);
  formData.append('min_saturation', (satSlider.value / 100).toFixed(2));

  try {
    const response = await fetch('/process', { method: 'POST', body: formData });
    if (!response.ok) {
      let msg = `Server error (${response.status})`;
      try { const d = await response.json(); if (d.detail) msg = d.detail; } catch (_) {}
      showError(msg);
      return;
    }
    const changes = response.headers.get('X-Changes-Made');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const base = selectedFile.name.toLowerCase().endsWith('.docx')
      ? selectedFile.name.slice(0, -5)
      : selectedFile.name;
    a.download = base + '_modified.docx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const count = changes !== null ? parseInt(changes, 10) : null;
    if (count === 0) showSuccess('No matching colored text found. File downloaded unchanged.');
    else if (count !== null) showSuccess(`Done — ${count} color change${count === 1 ? '' : 's'} made. File downloaded.`);
    else showSuccess('Done. File downloaded.');
  } catch (err) {
    showError('Network error — is the server running?');
    console.error(err);
  } finally {
    setLoading(false);
  }
});
