(() => {
  "use strict";

  const STORE_KEY = "psqt:v1";
  const I32_MIN = -2147483648, I32_MAX = 2147483647;
  const FILES = "abcdefgh";

  // values are kept in visual order: index 0 = a8, index 63 = h1
  const state = {
    values: new Int32Array(64),
    selected: new Set(),
    name: "PST",
    type: "i32",
    order: "a8",
  };
  const undoStack = [];
  const redoStack = [];
  let entry = null; // pending typed value, as a string

  const $ = (id) => document.getElementById(id);
  const board = $("board");
  const pill = $("pill");
  const pillLabel = $("pill-label");
  const pillValue = $("pill-value");
  const status = $("status");
  const nameInput = $("name");
  const copyBtn = $("copy");
  const squares = [];

  const sqName = (i) => FILES[i % 8] + (8 - Math.floor(i / 8));
  const fmt = (v) => (v < 0 ? "−" + -v : String(v));
  const clamp = (v) => Math.max(I32_MIN, Math.min(I32_MAX, v));

  // ---------- persistence ----------

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (Array.isArray(s.values) && s.values.length === 64) state.values.set(s.values.map((v) => clamp(v | 0)));
      if (typeof s.name === "string") state.name = s.name;
      if (s.type === "i16" || s.type === "i32") state.type = s.type;
      if (s.order === "a8" || s.order === "a1") state.order = s.order;
    } catch {}
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        values: Array.from(state.values),
        name: state.name,
        type: state.type,
        order: state.order,
      }));
    } catch {}
  }

  // ---------- history ----------

  function commit(mutate) {
    const before = state.values.slice();
    mutate();
    if (before.every((v, i) => v === state.values[i])) return;
    undoStack.push(before);
    if (undoStack.length > 200) undoStack.shift();
    redoStack.length = 0;
    save();
    render();
  }

  function undo() {
    if (!undoStack.length) return flash("Nothing to undo");
    redoStack.push(state.values.slice());
    state.values.set(undoStack.pop());
    save();
    render();
  }

  function redo() {
    if (!redoStack.length) return flash("Nothing to redo");
    undoStack.push(state.values.slice());
    state.values.set(redoStack.pop());
    save();
    render();
  }

  // ---------- rendering ----------

  function build() {
    const ranks = document.querySelector(".ranks");
    const files = document.querySelector(".files");
    for (let r = 8; r >= 1; r--) ranks.insertAdjacentHTML("beforeend", `<span>${r}</span>`);
    for (const f of FILES) files.insertAdjacentHTML("beforeend", `<span>${f}</span>`);

    for (let i = 0; i < 64; i++) {
      const el = document.createElement("div");
      const dark = (Math.floor(i / 8) + (i % 8)) % 2 === 1;
      el.className = "sq" + (dark ? " dark" : "");
      el.dataset.i = i;
      el.setAttribute("role", "gridcell");
      el.appendChild(document.createElement("span"));
      board.appendChild(el);
      squares.push(el);
    }
  }

  function render() {
    let max = 1;
    for (const v of state.values) max = Math.max(max, Math.abs(v));
    for (let i = 0; i < 64; i++) {
      const v = state.values[i];
      const el = squares[i];
      el.firstChild.textContent = fmt(v);
      el.classList.toggle("zero", v === 0);
      el.classList.toggle("neg", v < 0);
      el.classList.toggle("sel", state.selected.has(i));
      el.style.setProperty("--t", ((Math.abs(v) / max) * 0.28).toFixed(3));
      el.setAttribute("aria-label", `${sqName(i)} ${v}`);
      el.setAttribute("aria-selected", state.selected.has(i));
    }
    renderPill();
    renderStatus();
  }

  function renderPill() {
    if (entry === null) { pill.hidden = true; return; }
    const n = state.selected.size;
    pillLabel.textContent = n === 1 ? `Set ${sqName([...state.selected][0])}` : `Set ${n} squares`;
    pillValue.textContent = entry.replace("-", "−");
    pill.hidden = false;
  }

  let flashTimer = 0;
  function flash(msg) {
    status.textContent = msg;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { flashTimer = 0; renderStatus(); }, 1800);
  }

  function renderStatus() {
    if (flashTimer) return;
    const n = state.selected.size;
    if (!n) { status.textContent = ""; return; }
    let sum = 0;
    for (const i of state.selected) sum += state.values[i];
    const avg = Math.round((sum / n) * 10) / 10;
    status.textContent = n === 1
      ? sqName([...state.selected][0])
      : `${n} selected · avg ${fmt(avg)}`;
  }

  function renderControls() {
    nameInput.value = state.name;
    for (const [id, key] of [["type", "type"], ["order", "order"]]) {
      for (const b of $(id).querySelectorAll("button")) {
        b.setAttribute("aria-checked", b.dataset.v === state[key]);
      }
    }
  }

  // ---------- selection ----------

  let drag = null; // { mode: "add" | "remove" }

  function squareAt(x, y) {
    const el = document.elementFromPoint(x, y);
    const sq = el && el.closest(".sq");
    return sq ? +sq.dataset.i : -1;
  }

  function applyDrag(i) {
    if (i < 0) return;
    if (drag.mode === "add") state.selected.add(i);
    else state.selected.delete(i);
  }

  board.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const i = squareAt(e.clientX, e.clientY);
    if (i < 0) return;
    e.preventDefault();
    cancelEntry();
    const additive = e.shiftKey || e.metaKey || e.ctrlKey;
    if (additive) {
      drag = { mode: state.selected.has(i) ? "remove" : "add" };
    } else {
      state.selected.clear();
      drag = { mode: "add" };
    }
    applyDrag(i);
    board.setPointerCapture(e.pointerId);
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    render();
  });

  board.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const i = squareAt(e.clientX, e.clientY);
    const had = state.selected.has(i);
    applyDrag(i);
    if (i >= 0 && had !== state.selected.has(i)) render();
  });

  const endDrag = () => { drag = null; };
  board.addEventListener("pointerup", endDrag);
  board.addEventListener("pointercancel", endDrag);

  document.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".board, .controls, .pill")) return;
    if (!state.selected.size && entry === null) return;
    entry = null;
    state.selected.clear();
    render();
  });

  // ---------- editing ----------

  function cancelEntry() {
    if (entry === null) return;
    entry = null;
    renderPill();
  }

  function applyEntry() {
    const v = parseInt(entry, 10);
    entry = null;
    if (Number.isNaN(v)) { renderPill(); return; }
    commit(() => { for (const i of state.selected) state.values[i] = clamp(v); });
    render();
  }

  function nudge(delta) {
    commit(() => { for (const i of state.selected) state.values[i] = clamp(state.values[i] + delta); });
  }

  document.addEventListener("keydown", (e) => {
    if (e.target === nameInput) {
      if (e.key === "Enter" || e.key === "Escape") nameInput.blur();
      return;
    }
    if (e.target.closest && e.target.closest("button") && (e.key === "Enter" || e.key === " ")) return;

    const mod = e.metaKey || e.ctrlKey;
    const k = e.key;

    if (mod) {
      const lk = k.toLowerCase();
      if (lk === "z") { e.preventDefault(); cancelEntry(); e.shiftKey ? redo() : undo(); }
      else if (lk === "y") { e.preventDefault(); cancelEntry(); redo(); }
      else if (lk === "a") {
        e.preventDefault();
        for (let i = 0; i < 64; i++) state.selected.add(i);
        render();
      } else if (lk === "c" && !window.getSelection().toString()) {
        e.preventDefault();
        copyRust();
      }
      return;
    }

    if (/^[0-9]$/.test(k) || k === "-") {
      if (!state.selected.size) { flash("Select squares first"); return; }
      e.preventDefault();
      if (entry === null) entry = "";
      if (k === "-") entry = entry.startsWith("-") ? entry.slice(1) : "-" + entry;
      else if (entry.replace("-", "").length < 10) entry = (entry === "0" ? "" : entry === "-0" ? "-" : entry) + k;
      renderPill();
      return;
    }

    if (entry !== null) {
      if (k === "Enter" || k === "Tab") { e.preventDefault(); applyEntry(); }
      else if (k === "Escape") { e.preventDefault(); cancelEntry(); }
      else if (k === "Backspace") {
        e.preventDefault();
        entry = entry.slice(0, -1);
        if (entry === "") entry = null;
        renderPill();
      }
      return;
    }

    if (!state.selected.size) return;

    if (k === "ArrowUp" || k === "ArrowDown") {
      e.preventDefault();
      nudge((k === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 10 : 1));
    } else if (k === "Backspace" || k === "Delete") {
      e.preventDefault();
      commit(() => { for (const i of state.selected) state.values[i] = 0; });
    } else if (k === "Escape") {
      state.selected.clear();
      render();
    }
  });

  // ---------- export / import ----------

  function sanitizeName(s) {
    let n = s.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
    if (!n) n = "PST";
    if (/^[0-9]/.test(n)) n = "_" + n;
    return n;
  }

  function toRust() {
    const rows = [];
    for (let r = 0; r < 8; r++) rows.push(Array.from(state.values.slice(r * 8, r * 8 + 8)));
    if (state.order === "a1") rows.reverse();
    const width = Math.max(...rows.flat().map((v) => String(v).length));
    const body = rows
      .map((row) => "    " + row.map((v) => String(v).padStart(width) + ",").join(" "))
      .join("\n");
    return `pub const ${sanitizeName(state.name)}: [${state.type}; 64] = [\n${body}\n];\n`;
  }

  async function writeClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    }
  }

  let copyTimer = 0;
  async function copyRust() {
    const ok = await writeClipboard(toRust());
    copyBtn.textContent = ok ? "Copied" : "Copy failed";
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { copyBtn.textContent = "Copy Rust"; }, 1400);
    if (ok && state.type === "i16" && state.values.some((v) => v < -32768 || v > 32767)) {
      flash("Some values don't fit in i16");
    }
  }

  function parseNumbers(text) {
    const cleaned = text
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/\/\/.*$/gm, " ")
      .replace(/\[\s*[iu](?:8|16|32|64|128|size)\s*;\s*\d+\s*\]/g, " ");
    return (cleaned.match(/(?<![\w.])-?\d+(?![\w.])/g) || []).map(Number);
  }

  document.addEventListener("paste", (e) => {
    if (e.target === nameInput) return;
    const text = (e.clipboardData || window.clipboardData).getData("text");
    const nums = parseNumbers(text);
    if (nums.length === 1 && state.selected.size) {
      e.preventDefault();
      commit(() => { for (const i of state.selected) state.values[i] = clamp(nums[0]); });
      return;
    }
    if (nums.length !== 64) {
      flash(`Paste needs 64 numbers, found ${nums.length}`);
      return;
    }
    e.preventDefault();
    let vals = nums.map(clamp);
    if (state.order === "a1") {
      const rows = [];
      for (let r = 0; r < 8; r++) rows.push(vals.slice(r * 8, r * 8 + 8));
      vals = rows.reverse().flat();
    }
    cancelEntry();
    commit(() => state.values.set(vals));
    flash(`Imported table (${state.order} first)`);
  });

  // ---------- controls ----------

  for (const [id, key] of [["type", "type"], ["order", "order"]]) {
    $(id).addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      state[key] = b.dataset.v;
      save();
      renderControls();
    });
  }

  nameInput.addEventListener("input", () => { state.name = nameInput.value; save(); });
  nameInput.addEventListener("blur", () => {
    state.name = sanitizeName(nameInput.value);
    nameInput.value = state.name;
    save();
  });

  copyBtn.addEventListener("click", copyRust);

  load();
  build();
  renderControls();
  render();
})();
