const test = require('node:test');
const assert = require('node:assert/strict');
const { convert, normalizeNotes, makeNote } = require('../script.js');

test('convierte longitud, masa y temperatura con resultados literales', () => {
  assert.equal(convert('length', 2, 'km', 'm').value, 2000);
  assert.equal(convert('mass', 1, 'kg', 'g').value, 1000);
  assert.equal(convert('temperature', 0, 'c', 'f').value, 32);
  assert.equal(convert('temperature', 0, 'c', 'k').value, 273.15);
});

test('rechaza números no finitos y temperaturas imposibles', () => {
  assert.equal(convert('length', '', 'm', 'km').ok, false);
  assert.equal(convert('temperature', -274, 'c', 'k').ok, false);
  assert.equal(convert('temperature', -1, 'k', 'c').ok, false);
});

test('normaliza almacenamiento corrupto y valida notas nuevas', () => {
  assert.deepEqual(normalizeNotes('no-json'), []);
  assert.deepEqual(normalizeNotes(JSON.stringify([{ id: '1', texto: 'Repasar', categoria: 'Repasos' }])).length, 1);
  assert.equal(makeNote('   ', 'Dudas').ok, false);
  assert.equal(makeNote('Revisar unidades', 'Cálculos').note.categoria, 'Cálculos');
});
