import '@google/model-viewer';
import { createLiveData } from './live-data.js';

// ---- DOM 引用 ----
const viewer = document.getElementById('viewer');
const fileInput = document.getElementById('file-input');
const fileNameEl = document.getElementById('file-name');
const dropHint = document.getElementById('drop-hint');
const poiEditHint = document.getElementById('poi-edit-hint');
const poiPanel = document.getElementById('poi-panel');
const poiList = document.getElementById('poi-list');
const togglePoiEdit = document.getElementById('toggle-poi-edit');
const togglePoiVis = document.getElementById('toggle-poi-vis');
const poiClearBtn = document.getElementById('poi-clear');
const poiCloseBtn = document.getElementById('poi-close');
const displayEditHint = document.getElementById('display-edit-hint');
const displayPanel = document.getElementById('display-panel');
const displayList = document.getElementById('display-list');
const toggleDisplayEdit = document.getElementById('toggle-display-edit');
const toggleDisplayVis = document.getElementById('toggle-display-vis');
const displayClearBtn = document.getElementById('display-clear');
const displayCloseBtn = document.getElementById('display-close');

// ---- 模式切换 DOM ----
const modeGlbBtn = document.getElementById('mode-glb');
const modeGsBtn = document.getElementById('mode-gs');
const uploadGlbBtn = document.getElementById('upload-glb-btn');
const glbTools = document.getElementById('glb-tools');
const gsTools = document.getElementById('gs-tools');
const gsFrame = document.getElementById('gs-frame');
const gsModelSelect = document.getElementById('gs-model-select');
const gsModelName = document.getElementById('gs-model-name');

// ---- 3DGS 场景(由 public/gs-data/models.json 驱动,支持多模型下拉切换) ----
const GS_VIEWER_BASE = '/gs-viewer/index.html';
const GS_QUALITY_BUDGET = { high: 10, standard: 4 };
const GS_FORMAT_ORDER = ['sog', 'tile', 'ply'];
const FALLBACK_MODEL = {
  id: 'default',
  name: '公司全景(照片GS)',
  formats: {
    sog: 'scene.sog',
    tile: 'model-gs-sog-tile/MipModel/lod-meta.json',
    ply: 'scene.ply'
  }
};
let gsModels = null;
let gsModelId = null;
let gsLoaded = false;
let gsModelsLoaded = false;

async function loadGsModels() {
  try {
    const res = await fetch('/gs-data/models.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    gsModels = Array.isArray(data?.models) && data.models.length > 0 ? data.models : null;
  } catch (_) {
    gsModels = null;
  }
  if (!gsModels) {
    gsModelId = FALLBACK_MODEL.id;
    gsModelSelect.innerHTML = `<option value="${FALLBACK_MODEL.id}">${FALLBACK_MODEL.name}</option>`;
    updateGsModelUI();
    return;
  }
  gsModelId = gsModels[0].id;
  gsModelSelect.innerHTML = gsModels.map((m) => `<option value="${m.id}">${m.name}</option>`).join('');
  updateGsModelUI();
}

function currentGsModel() {
  if (gsModels) return gsModels.find((m) => m.id === gsModelId) || gsModels[0];
  return FALLBACK_MODEL;
}

function updateGsModelUI() {
  const model = currentGsModel();
  GS_FORMAT_ORDER.forEach((fmt) => {
    const label = document.getElementById(`gs-fmt-${fmt}`);
    if (label) label.hidden = !model.formats[fmt];
  });
  const checked = document.querySelector('input[name="gs-format"]:checked');
  if (!checked || !model.formats[checked.value]) {
    const first = GS_FORMAT_ORDER.find((fmt) => model.formats[fmt]);
    if (first) {
      const radio = document.querySelector(`input[name="gs-format"][value="${first}"]`);
      if (radio) radio.checked = true;
    }
  }
  gsModelName.textContent = model.name;
}

function currentGsUrl() {
  const model = currentGsModel();
  const fmtEl = document.querySelector('input[name="gs-format"]:checked');
  const qEl = document.querySelector('input[name="gs-quality"]:checked');
  const fmt = fmtEl && model.formats[fmtEl.value] ? fmtEl.value : GS_FORMAT_ORDER.find((f) => model.formats[f]);
  const scene = `/gs-data/${model.formats[fmt]}`;
  const budget = GS_QUALITY_BUDGET[qEl ? qEl.value : 'high'];
  return `${GS_VIEWER_BASE}?content=${scene}&budget=${budget}&lang=zh-CN`;
}

// 切换展示模式:'glb' | 'gs'
async function showMode(mode) {
  const isGlb = mode === 'glb';
  modeGlbBtn.classList.toggle('active', isGlb);
  modeGsBtn.classList.toggle('active', !isGlb);
  uploadGlbBtn.hidden = !isGlb;
  glbTools.hidden = !isGlb;
  gsTools.hidden = isGlb;
  viewer.hidden = !isGlb;
  gsFrame.hidden = isGlb;
  if (isGlb) {
    gsFrame.src = '';
    gsLoaded = false;
  } else {
    dropHint.classList.add('drop-hint--hidden');
    if (poiEditing) setPoiEditing(false);
    if (displayEditing) setDisplayEditing(false);
    if (!gsLoaded) {
      if (!gsModelsLoaded) {
        gsModelsLoaded = true;
        await loadGsModels();
      }
      gsFrame.src = currentGsUrl();
      gsLoaded = true;
    }
  }
}

modeGlbBtn.addEventListener('click', () => showMode('glb'));
modeGsBtn.addEventListener('click', () => showMode('gs'));

gsModelSelect.addEventListener('change', () => {
  gsModelId = gsModelSelect.value;
  updateGsModelUI();
  if (!gsFrame.hidden) gsFrame.src = currentGsUrl();
});

document.querySelectorAll('input[name="gs-format"], input[name="gs-quality"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    if (!gsFrame.hidden) gsFrame.src = currentGsUrl();
  });
});

// ---- 全局状态 ----
let currentUrl = null;

// 观察点位(用于近距离观察模型)
let poiListData = []; // { id, x, y, z }
let poiEditing = false;
let poiBright = true; // 高亮(true) / 低亮(false, 50% 透明)
let nextPoiId = 1;

// 设备数显(用于显示设备实时数据)
let displayListData = []; // { id, x, y, z, label, unit, value }
let displayEditing = false;
let displayBright = true; // 高亮(true) / 低亮(false, 50% 透明)
let nextDisplayId = 1;

// ---- 实时设备数据(数据源见 live-data.js) ----
const liveData = createLiveData({
  onValue: ({ deviceId, value }) => updateDisplayValue(deviceId, value)
});
let stopLiveData = null;

// 旋转模式:'none' | 'rotate'
let rotMode = 'none';

// ---- GLB 加载 ----
function loadGlb(file) {
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  const url = URL.createObjectURL(file);
  currentUrl = url;
  dropHint.classList.add('drop-hint--hidden');
  viewer.src = url;
  viewer.autoRotate = rotMode === 'rotate';
}

fileInput.addEventListener('change', () => {
  const file = fileInput.files && fileInput.files[0];
  if (file) {
    fileNameEl.textContent = file.name;
    loadGlb(file);
  }
  fileInput.value = '';
});

// ---- 拖拽 ----
let dragCount = 0;
document.addEventListener('dragenter', (e) => {
  e.preventDefault();
  dragCount++;
  dropHint.classList.add('drop-hint--active');
});
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('dragleave', () => {
  dragCount = Math.max(0, dragCount - 1);
  if (dragCount === 0) dropHint.classList.remove('drop-hint--active');
});
document.addEventListener('drop', (e) => {
  e.preventDefault();
  dragCount = 0;
  dropHint.classList.remove('drop-hint--active');
  const file = e.dataTransfer && e.dataTransfer.files[0];
  if (!file) return;
  if (/\.glb$/i.test(file.name)) {
    fileNameEl.textContent = file.name;
    loadGlb(file);
  } else {
    alert('本项目仅支持 .glb 格式。');
  }
});

viewer.addEventListener('load', () => {
  dropHint.classList.add('drop-hint--hidden');
  renderHotspots();
  renderDisplays();
});
viewer.addEventListener('error', () => {
  dropHint.classList.remove('drop-hint--hidden');
  alert('模型加载失败。请确认这是一个有效的 .glb 文件。');
});

// 屏蔽右键菜单
viewer.addEventListener('contextmenu', (e) => e.preventDefault());

function rad2deg(r) {
  return ((r * 180) / Math.PI).toFixed(2);
}

// 镜头拉近到某点
function focusAt(x, y, z) {
  const target = `${x} ${y} ${z}`;
  viewer.cameraTarget = target;
  const orbit = viewer.getCameraOrbit();
  const newRadius = Math.max(orbit.radius * 0.35, 0.1);
  viewer.cameraOrbit = `${rad2deg(orbit.theta)}deg ${rad2deg(orbit.phi)}deg ${newRadius}m`;
  viewer.jumpCameraToGoal();
}

// ===== 点位(POI):观察定位点 =====

// 渲染观察点位(明显标记圆点 + 序号)
function renderHotspots() {
  viewer.querySelectorAll('.poi-dot').forEach((el) => el.remove());
  poiListData.forEach((p, i) => {
    const btn = document.createElement('button');
    btn.classList.add('poi-dot');
    if (!poiBright) btn.classList.add('dim');
    btn.dataset.poiId = String(p.id);
    btn.slot = `hotspot-${i}`;
    btn.dataset.position = `${p.x} ${p.y} ${p.z}`;
    btn.title = `点位 ${i + 1}：点击拉近观察`;
    btn.textContent = String(i + 1);
    btn.addEventListener('click', () => focusAt(p.x, p.y, p.z));
    viewer.appendChild(btn);
  });
}

// 编辑面板
function renderPoiList() {
  poiList.innerHTML = '';
  if (poiListData.length === 0) {
    poiList.innerHTML = '<div class="poi-empty">尚无点位。开启「编辑点位」后点击模型表面添加。</div>';
    return;
  }
  poiListData.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'poi-row';

    const info = document.createElement('div');
    info.className = 'poi-row-main';

    const label = document.createElement('span');
    label.className = 'poi-row-label';
    label.textContent = `#${i + 1}`;

    const coords = document.createElement('div');
    coords.className = 'poi-row-coords';
    coords.innerHTML =
      `<input class="poi-xyz" data-idx="${i}" data-axis="x" type="number" step="0.01" value="${p.x.toFixed(3)}"> ` +
      `<input class="poi-xyz" data-idx="${i}" data-axis="y" type="number" step="0.01" value="${p.y.toFixed(3)}"> ` +
      `<input class="poi-xyz" data-idx="${i}" data-axis="z" type="number" step="0.01" value="${p.z.toFixed(3)}">`;

    const btnGo = document.createElement('button');
    btnGo.className = 'btn btn-ghost btn-sm';
    btnGo.textContent = '跳转';
    btnGo.addEventListener('click', () => focusAt(p.x, p.y, p.z));

    const btnDel = document.createElement('button');
    btnDel.className = 'btn btn-ghost btn-sm poi-del';
    btnDel.textContent = '删除';
    btnDel.addEventListener('click', () => {
      poiListData.splice(i, 1);
      renderPoiList();
      renderHotspots();
    });

    info.appendChild(label);
    info.appendChild(coords);
    row.appendChild(info);
    row.appendChild(btnGo);
    row.appendChild(btnDel);
    poiList.appendChild(row);
  });

  poiList.querySelectorAll('.poi-xyz').forEach((inp) => {
    inp.addEventListener('change', () => {
      const idx = +inp.dataset.idx;
      const axis = inp.dataset.axis;
      const v = parseFloat(inp.value);
      if (!isNaN(v) && poiListData[idx]) {
        poiListData[idx][axis] = v;
        renderHotspots();
      }
    });
  });
}

function setPoiEditing(on) {
  poiEditing = on;
  togglePoiEdit.classList.toggle('active', on);
  poiPanel.hidden = !on;
  poiEditHint.hidden = !on;
  displayEditHint.hidden = true;
  if (on) {
    setDisplayEditing(false); // 两编辑模式互斥
    renderPoiList();
  } else {
    poiEditHint.hidden = true;
  }
}

togglePoiEdit.addEventListener('click', () => setPoiEditing(!poiEditing));

togglePoiVis.addEventListener('click', () => {
  poiBright = !poiBright;
  togglePoiVis.classList.toggle('active', poiBright);
  renderHotspots();
});

poiCloseBtn.addEventListener('click', () => setPoiEditing(false));
poiClearBtn.addEventListener('click', () => {
  if (poiListData.length && confirm('清空所有点位？')) {
    poiListData = [];
    renderPoiList();
    renderHotspots();
  }
});

// 编辑模式下点击模型添加观察点位
function addPoiAtScreen(e) {
  let x, y, z;
  let onSurface = false;
  try {
    const rect = viewer.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const picked = viewer.positionAndNormalFromPoint(px, py);
    if (picked && picked.position) {
      [x, y, z] = picked.position;
      onSurface = true;
    }
  } catch (_) {}

  if (!onSurface) {
    const t = viewer.getCameraTarget();
    [x, y, z] = [t.x, t.y, t.z];
  }
  poiListData.push({ id: nextPoiId++, x, y, z });
  return true;
}

// ===== 数显(Display):显示设备实时数据 =====

// 数值格式化
function formatValue(v) {
  if (v === undefined || v === null || Number.isNaN(v)) return '—';
  const n = Number(v);
  return Number.isInteger(n) ? String(n) : n.toFixed(3);
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// 渲染数显(数据气泡)
function renderDisplays() {
  viewer.querySelectorAll('.display-dot').forEach((el) => el.remove());
  displayListData.forEach((d, j) => {
    const btn = document.createElement('button');
    btn.classList.add('display-dot');
    if (!displayBright) btn.classList.add('dim');
    btn.dataset.displayId = String(d.id);
    btn.slot = `display-${j}`;
    btn.dataset.position = `${d.x} ${d.y} ${d.z}`;
    btn.title = d.label ? `${d.label}：点击拉近观察` : '数显：点击拉近观察';
    btn.addEventListener('click', () => focusAt(d.x, d.y, d.z));

    if (d.label) {
      const nameEl = document.createElement('span');
      nameEl.className = 'display-dot-name';
      nameEl.textContent = d.label;
      btn.appendChild(nameEl);
    }
    const valEl = document.createElement('span');
    valEl.className = 'display-dot-value';
    valEl.textContent = d.value !== undefined ? formatValue(d.value) + (d.unit ? ` ${d.unit}` : '') : '—';
    btn.appendChild(valEl);

    viewer.appendChild(btn);
  });
}

function updateDisplayValue(displayId, value) {
  const d = displayListData.find((it) => it.id === displayId);
  if (!d) return;
  d.value = value;
  const valEl = viewer.querySelector(`.display-dot[data-display-id="${displayId}"] .display-dot-value`);
  if (valEl) {
    valEl.textContent = formatValue(value) + (d.unit ? ` ${d.unit}` : '');
  }
}

// 数显编辑面板
function renderDisplayList() {
  displayList.innerHTML = '';
  if (displayListData.length === 0) {
    displayList.innerHTML = '<div class="poi-empty">无数显。开启「添加数显」后点击模型表面添加。</div>';
    return;
  }
  displayListData.forEach((d, j) => {
    const row = document.createElement('div');
    row.className = 'poi-row';

    const info = document.createElement('div');
    info.className = 'poi-row-main';

    const label = document.createElement('span');
    label.className = 'poi-row-label';
    label.textContent = `#${j + 1}`;

    const meta = document.createElement('div');
    meta.className = 'poi-row-meta';
    meta.innerHTML =
      `<input class="display-name" data-idx="${j}" type="text" placeholder="设备名" value="${escapeAttr(d.label || '')}"> ` +
      `<input class="display-unit" data-idx="${j}" type="text" placeholder="单位" value="${escapeAttr(d.unit || '')}">`;

    const coords = document.createElement('div');
    coords.className = 'poi-row-coords';
    coords.innerHTML =
      `<input class="display-xyz" data-idx="${j}" data-axis="x" type="number" step="0.01" value="${d.x.toFixed(3)}"> ` +
      `<input class="display-xyz" data-idx="${j}" data-axis="y" type="number" step="0.01" value="${d.y.toFixed(3)}"> ` +
      `<input class="display-xyz" data-idx="${j}" data-axis="z" type="number" step="0.01" value="${d.z.toFixed(3)}">`;

    const btnGo = document.createElement('button');
    btnGo.className = 'btn btn-ghost btn-sm';
    btnGo.textContent = '跳转';
    btnGo.addEventListener('click', () => focusAt(d.x, d.y, d.z));

    const btnDel = document.createElement('button');
    btnDel.className = 'btn btn-ghost btn-sm poi-del';
    btnDel.textContent = '删除';
    btnDel.addEventListener('click', () => {
      liveData.unsubscribe(d.id);
      displayListData.splice(j, 1);
      renderDisplayList();
      renderDisplays();
    });

    info.appendChild(label);
    info.appendChild(meta);
    info.appendChild(coords);
    row.appendChild(info);
    row.appendChild(btnGo);
    row.appendChild(btnDel);
    displayList.appendChild(row);
  });

  displayList.querySelectorAll('.display-name').forEach((inp) => {
    inp.addEventListener('change', () => {
      const idx = +inp.dataset.idx;
      if (displayListData[idx]) {
        displayListData[idx].label = inp.value.trim();
        renderDisplays();
      }
    });
  });
  displayList.querySelectorAll('.display-unit').forEach((inp) => {
    inp.addEventListener('change', () => {
      const idx = +inp.dataset.idx;
      if (displayListData[idx]) {
        displayListData[idx].unit = inp.value.trim();
        renderDisplays();
      }
    });
  });
  displayList.querySelectorAll('.display-xyz').forEach((inp) => {
    inp.addEventListener('change', () => {
      const idx = +inp.dataset.idx;
      const axis = inp.dataset.axis;
      const v = parseFloat(inp.value);
      if (!isNaN(v) && displayListData[idx]) {
        displayListData[idx][axis] = v;
        renderDisplays();
      }
    });
  });
}

function setDisplayEditing(on) {
  displayEditing = on;
  toggleDisplayEdit.classList.toggle('active', on);
  displayPanel.hidden = !on;
  displayEditHint.hidden = !on;
  poiEditHint.hidden = true;
  if (on) {
    setPoiEditing(false); // 两编辑模式互斥
    renderDisplayList();
  } else {
    displayEditHint.hidden = true;
  }
}

toggleDisplayEdit.addEventListener('click', () => setDisplayEditing(!displayEditing));

toggleDisplayVis.addEventListener('click', () => {
  displayBright = !displayBright;
  toggleDisplayVis.classList.toggle('active', displayBright);
  renderDisplays();
});

displayCloseBtn.addEventListener('click', () => setDisplayEditing(false));
displayClearBtn.addEventListener('click', () => {
  if (displayListData.length && confirm('清空所有数显？')) {
    displayListData.forEach((d) => liveData.unsubscribe(d.id));
    displayListData = [];
    renderDisplayList();
    renderDisplays();
  }
});

// 编辑模式下点击模型添加数显
function addDisplayAtScreen(e) {
  let x, y, z;
  let onSurface = false;
  try {
    const rect = viewer.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const picked = viewer.positionAndNormalFromPoint(px, py);
    if (picked && picked.position) {
      [x, y, z] = picked.position;
      onSurface = true;
    }
  } catch (_) {}

  if (!onSurface) {
    const t = viewer.getCameraTarget();
    [x, y, z] = [t.x, t.y, t.z];
  }
  const d = { id: nextDisplayId++, x, y, z, label: '', unit: '', value: undefined };
  displayListData.push(d);
  liveData.subscribe(d.id);
  if (!stopLiveData) stopLiveData = liveData.startDemo();
  return d;
}

// 记录按下位置,用于区分"点击"与"拖拽拖动模型"
let dragStartPt = null;
viewer.addEventListener('pointerdown', (e) => {
  dragStartPt = { x: e.clientX, y: e.clientY };
});

// 编辑模式下点击模型:按当前编辑模式处理(拖动模型不新增)
viewer.addEventListener('click', (e) => {
  if (!poiEditing && !displayEditing) return;
  // 位移超过阈值视为拖动模型,不新增点位/数显
  if (dragStartPt) {
    const dx = e.clientX - dragStartPt.x;
    const dy = e.clientY - dragStartPt.y;
    dragStartPt = null;
    if (dx * dx + dy * dy > 25) return; // 移动超过约 5px 即视为拖动
  }
  // 点到已有标记时不新增
  if (e.target.classList && (e.target.classList.contains('poi-dot') || e.target.classList.contains('display-dot'))) return;

  if (poiEditing) {
    addPoiAtScreen(e);
    renderPoiList();
    renderHotspots();
  } else if (displayEditing) {
    addDisplayAtScreen(e);
    renderDisplayList();
    renderDisplays();
  }
});

// ===== 旋转逻辑: none(静止) / rotate(旋转) =====
document.querySelectorAll('input[name="rot-mode"]').forEach((radio) => {
  radio.addEventListener('change', (e) => {
    applyRotMode(e.target.value);
  });
});

function applyRotMode(mode) {
  rotMode = mode;
  viewer.autoRotate = mode === 'rotate';
}

// 面板宽度可拖拽调整(左边缘手柄)
function initPanelResize() {
  document.querySelectorAll('.poi-resize-handle').forEach((handle) => {
    const panel = handle.closest('.poi-panel');
    if (!panel) return;
    handle.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startW = panel.offsetWidth;
      panel.classList.add('resizing');
      const move = (ev) => {
        ev.preventDefault();
        const w = startW + (startX - ev.clientX);
        panel.style.width = `${Math.max(240, Math.min(520, w))}px`;
      };
      const up = () => {
        panel.classList.remove('resizing');
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  });
}

// 首次渲染
initPanelResize();
renderHotspots();
renderDisplays();
renderPoiList();