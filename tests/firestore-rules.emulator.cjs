// Run only through Firebase emulators:exec as described in START-HERE-FIREBASE.
// These REST tests deliberately cannot be pointed at a live Firebase project.
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { createMockUserToken } = require('@firebase/util');
const project = 'demo-timepaytracker';
const base = `http://127.0.0.1:8080/v1/projects/${project}/databases/(default)/documents`;
const headers = user => ({ 'Content-Type': 'application/json',
  ...(user ? { Authorization: `Bearer ${user === 'owner' ? 'owner' : createMockUserToken({ sub: user }, project)}` } : {}) });
function encode(data) {
  return { fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key,
    typeof value === 'boolean' ? { booleanValue: value } :
    typeof value === 'number' ? (Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }) :
    { stringValue: value }
  ])) };
}
async function request(user, method, path, data) {
  return fetch(`${base}/${path}`, { method, headers: headers(user),
    ...(data ? { body: JSON.stringify(encode(data)) } : {}), signal: AbortSignal.timeout(5000) });
}
const row = (id, userId = 'alice') => ({
  id, teamId: 'company-team', userId, memberName: userId === 'alice' ? 'Alice' : 'Bob',
  date: '2026-08-24', clockIn: '07:00', clockOut: '15:00', breakMinutes: 0,
  regularHours: 8, overtimeHours: 0, totalHours: 8, updatedAt: '2026-08-29T12:00:00Z'
});
before(async () => {
  for (const [uid, displayName, active] of [['alice', 'Alice', true], ['bob', 'Bob', true], ['inactive', 'Inactive', false]]) {
    assert.equal((await request('owner', 'PATCH', `teams/company-team/members/${uid}`, { displayName, active, role: 'member' })).ok, true);
  }
  assert.equal((await request('owner', 'PATCH', 'teams/company-team/hours/alice_seed', row('alice_seed'))).ok, true);
});
test('anonymous and non-member reads denied; another member can read', async () => {
  for (const uid of [null, 'outsider', 'inactive']) {
    assert.equal((await request(uid, 'GET', 'teams/company-team/hours/alice_seed')).status, 403);
  }
  assert.equal((await request('bob', 'GET', 'teams/company-team/hours/alice_seed')).status, 200);
});
test('coworker cannot take ownership or delete an existing record', async () => {
  assert.equal((await request('bob', 'PATCH', 'teams/company-team/hours/alice_seed', row('alice_seed', 'bob'))).status, 403);
  assert.equal((await request('bob', 'DELETE', 'teams/company-team/hours/alice_seed')).status, 403);
});
test('pay and rate fields are rejected by the server', async () => {
  for (const field of ['hourlyRate', 'overtimeRate', 'grossPay', 'estimatedPay', 'totalPay']) {
    const id = `alice_forbidden_${field}`;
    assert.equal((await request('alice', 'PATCH', `teams/company-team/hours/${id}`, { ...row(id), [field]: 10 })).status, 403);
  }
});
test('own create, update and delete allowed; extra fields cannot be added later', async () => {
  const id = 'alice_edit'; const path = `teams/company-team/hours/${id}`;
  assert.equal((await request('alice', 'PATCH', path, row(id))).ok, true);
  assert.equal((await request('alice', 'PATCH', path, { ...row(id), clockOut: '16:00', overtimeHours: 1, totalHours: 9 })).ok, true);
  assert.equal((await request('alice', 'PATCH', path, { ...row(id), totalPay: 200 })).status, 403);
  assert.equal((await request('alice', 'DELETE', path)).ok, true);
});
test('notes can be shared, edited and cleared but must be text', async () => {
  const id = 'alice_notes'; const path = `teams/company-team/hours/${id}`;
  for (const notes of ['Site A\nRepairs complete', 'Updated note', '']) {
    assert.equal((await request('alice', 'PATCH', path, { ...row(id), notes })).ok, true);
    const response = await request('bob', 'GET', path);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).fields.notes.stringValue, notes);
  }
  assert.equal((await request('alice', 'PATCH', path, { ...row(id), notes: 10 })).status, 403);
  assert.equal((await request('outsider', 'GET', path)).status, 403);
  assert.equal((await request('outsider', 'PATCH', 'teams/company-team/hours/outsider_notes', { ...row('outsider_notes', 'outsider'), notes: 'No access' })).status, 403);
});

test('members cannot self-enroll or promote themselves', async () => {
  assert.equal((await request('outsider', 'PATCH', 'teams/company-team/members/outsider', { displayName: 'Outsider', role: 'admin', active: true })).status, 403);
  assert.equal((await request('alice', 'PATCH', 'teams/company-team/members/alice', { displayName: 'Alice', role: 'admin', active: true })).status, 403);
});
test('cross-team access and spoofed names denied', async () => {
  assert.equal((await request('alice', 'PATCH', 'teams/another-team/hours/alice_cross', { ...row('alice_cross'), teamId: 'another-team' })).status, 403);
  assert.equal((await request('alice', 'PATCH', 'teams/company-team/hours/alice_name', { ...row('alice_name'), memberName: 'Bob' })).status, 403);
});
