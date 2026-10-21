const test = require('node:test');
const assert = require('node:assert/strict');
const { internshipSchema } = require('../src/validation');

const validRecord = {
  title: 'API Intern',
  company: 'Example Labs',
  location: 'Remote',
  mode: 'remote',
  start_date: '2026-11-01',
  stipend: 0
};

test('accepts a valid internship record', () => {
  assert.equal(internshipSchema.safeParse(validRecord).success, true);
});

test('rejects unsupported work modes', () => {
  assert.equal(internshipSchema.safeParse({ ...validRecord, mode: 'anywhere' }).success, false);
});

test('rejects invalid calendar dates', () => {
  assert.equal(internshipSchema.safeParse({ ...validRecord, start_date: '2026-02-30' }).success, false);
});

test('rejects unknown fields', () => {
  assert.equal(internshipSchema.safeParse({ ...validRecord, admin: true }).success, false);
});

test('rejects an end date before the start date', () => {
  assert.equal(internshipSchema.safeParse({ ...validRecord, end_date: '2026-10-01' }).success, false);
});
