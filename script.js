(function () {
  const STORAGE_KEY = 'orbita-de-ideas:notas:v1';
  const CATEGORIES = ['Repasos', 'Dudas', 'Cálculos'];
  const UNITS = { length: ['m', 'km', 'cm'], mass: ['g', 'kg'], temperature: ['c', 'f', 'k'] };

  function id() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  function makeNote(text, categoria, noteId = id()) {
    const clean = String(text ?? '').trim();
    if (!clean) return { ok: false, message: 'Escribí una nota antes de guardarla.' };
    if (!CATEGORIES.includes(categoria)) return { ok: false, message: 'Elegí una categoría válida.' };
    return { ok: true, note: { id: noteId, texto: clean, categoria } };
  }
  function normalizeNotes(raw) {
    try {
      const parsed = JSON.parse(raw || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((note) => note && typeof note.id === 'string' && typeof note.texto === 'string' && note.texto.trim() && CATEGORIES.includes(note.categoria));
    } catch { return []; }
  }
  function round(value) { return Math.round((value + Number.EPSILON) * 1e6) / 1e6; }
  function convert(type, rawValue, from, to) {
    if (rawValue === '' || rawValue === null || rawValue === undefined) return { ok: false, message: 'Ingresá un valor para convertir.' };
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return { ok: false, message: 'Ingresá un número válido.' };
    if (!UNITS[type]?.includes(from) || !UNITS[type]?.includes(to)) return { ok: false, message: 'Elegí unidades válidas.' };
    let result;
    if (type === 'length') { const meters = value * { m: 1, km: 1000, cm: .01 }[from]; result = meters / { m: 1, km: 1000, cm: .01 }[to]; }
    else if (type === 'mass') { const grams = value * { g: 1, kg: 1000 }[from]; result = grams / { g: 1, kg: 1000 }[to]; }
    else {
      const celsius = from === 'c' ? value : from === 'f' ? (value - 32) * 5 / 9 : value - 273.15;
      if (celsius < -273.15) return { ok: false, message: 'La temperatura está por debajo del cero absoluto.' };
      result = to === 'c' ? celsius : to === 'f' ? celsius * 9 / 5 + 32 : celsius + 273.15;
    }
    if (!Number.isFinite(result)) return { ok: false, message: 'No se pudo obtener un resultado finito.' };
    return { ok: true, value: round(result), unit: to };
  }

  function init() {
    let notes = [];
    let currentConversion = null;
    const messageNotes = document.querySelector('#mensaje-notas');
    try { const raw = localStorage.getItem(STORAGE_KEY); notes = normalizeNotes(raw); if (raw && notes.length === 0 && raw !== '[]') messageNotes.textContent = 'Los datos guardados no eran válidos; se inició un pizarrón vacío.'; } catch { messageNotes.textContent = 'No se pudo leer el almacenamiento; podés seguir usando la pantalla.'; }
    const list = document.querySelector('#lista-notas');
    const filter = document.querySelector('#filtro-categoria');
    function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); return true; } catch { messageNotes.textContent = 'No se pudo guardar en este navegador; los cambios seguirán visibles durante la sesión.'; return false; } }
    function render() {
      list.replaceChildren();
      const visible = notes.filter((note) => filter.value === 'Todas' || note.categoria === filter.value);
      if (!visible.length) { const empty = document.createElement('p'); empty.textContent = 'Todavía no hay notas en esta vista.'; list.append(empty); return; }
      visible.forEach((note) => {
        const article = document.createElement('article'); article.className = 'nota'; article.dataset.category = note.categoria;
        const category = document.createElement('strong'); category.textContent = note.categoria;
        const text = document.createElement('p'); text.textContent = note.texto;
        const actions = document.createElement('div'); actions.className = 'nota-acciones';
        const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = 'Editar'; edit.addEventListener('click', () => { const next = window.prompt('Editar nota', note.texto); if (next === null) return; const result = makeNote(next, note.categoria, note.id); if (!result.ok) { messageNotes.textContent = result.message; return; } notes = notes.map((item) => item.id === note.id ? result.note : item); persist(); render(); });
        const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Eliminar'; remove.addEventListener('click', () => { notes = notes.filter((item) => item.id !== note.id); persist(); render(); });
        actions.append(edit, remove); article.append(category, text, actions); list.append(article);
      });
    }
    document.querySelector('#form-nota').addEventListener('submit', (event) => { event.preventDefault(); const input = document.querySelector('#nota-texto'); const result = makeNote(input.value, document.querySelector('#nota-categoria').value); if (!result.ok) { messageNotes.textContent = result.message; return; } notes.unshift(result.note); persist(); input.value = ''; messageNotes.textContent = 'Nota guardada.'; render(); });
    filter.addEventListener('change', render);

    const type = document.querySelector('#tipo-conversion'); const from = document.querySelector('#unidad-origen'); const to = document.querySelector('#unidad-destino'); const rawValue = document.querySelector('#valor-conversion'); const output = document.querySelector('#resultado-conversion'); const conversionMessage = document.querySelector('#mensaje-conversion'); const saveConversion = document.querySelector('#guardar-conversion');
    function fillUnits() { from.replaceChildren(); to.replaceChildren(); UNITS[type.value].forEach((unit) => { const a = new Option(unit.toUpperCase(), unit); const b = new Option(unit.toUpperCase(), unit); from.add(a); to.add(b); }); if (to.options.length > 1) to.selectedIndex = 1; invalidate(); }
    function invalidate() { currentConversion = null; output.textContent = '—'; conversionMessage.textContent = ''; saveConversion.disabled = true; }
    [rawValue, from, to].forEach((element) => element.addEventListener('input', invalidate)); type.addEventListener('change', fillUnits);
    document.querySelector('#convertir').addEventListener('click', () => { const result = convert(type.value, rawValue.value, from.value, to.value); if (!result.ok) { invalidate(); conversionMessage.textContent = result.message; return; } currentConversion = `${rawValue.value} ${from.value.toUpperCase()} = ${result.value} ${result.unit.toUpperCase()}`; output.textContent = `${result.value} ${result.unit.toUpperCase()}`; saveConversion.disabled = false; });
    saveConversion.addEventListener('click', () => { if (!currentConversion) return; const result = makeNote(currentConversion, 'Cálculos'); notes.unshift(result.note); persist(); messageNotes.textContent = 'Conversión guardada como nota.'; filter.value = 'Todas'; render(); });
    fillUnits(); render();
  }
  if (typeof module !== 'undefined') module.exports = { convert, normalizeNotes, makeNote };
  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', init);
}());
