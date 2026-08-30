const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

// Isolated TS loader: tests exercise production functions with in-memory IO.
function loader(mocks = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(root, file);
    if (!path.extname(file)) file += '.ts';
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.React }
    }).outputText;
    const req = spec => {
      if (Object.hasOwn(mocks, spec)) return mocks[spec];
      if (spec.startsWith('.')) return load(path.resolve(path.dirname(file), spec));
      return require(spec);
    };
    new Function('require', 'module', 'exports', code)(req, module, module.exports);
    return module.exports;
  }
  return load;
}
function memory() {
  const data = new Map();
  return { data, getItem: async key => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
    removeItem: async key => { data.delete(key); },
    multiGet: async keys => keys.map(key => [key, data.get(key) ?? null]) };
}
const load = loader();
const shared = load('src/services/sharedHours.ts');
const entry = { id: 'shift/1', date: '2026-08-24', clockIn: '07:00', clockOut: '15:00', breakMinutes: 30, notes: 'Private note', hourlyRate: 90, totalPay: 675 };
const project = e => shared.projectHours(e, 'company-team', 'alice', 'Alice');

test('coming-soon scan control is disabled, labelled and has no action', () => {
  const { ComingSoonScan } = loader({
    'react-native': { Pressable: 'button', Text: 'span' },
    '../context/ThemeContext': { useAppTheme: () => ({ colors: { muted: '#64748B', border: '#E2E8F0', surfaceAlt: '#F8FAFC' } }) }
  })('src/components/ComingSoonScan.tsx');
  const element = ComingSoonScan({ label: 'UPLOAD IMAGE' });
  assert.equal(element.props.disabled, true);
  assert.equal(element.props.accessibilityState.disabled, true);
  assert.equal(element.props.onPress, undefined);
  assert.match(element.props.accessibilityLabel, /Coming soon/);
  assert.equal(element.props.children[0].props.children, 'COMING SOON');
  for (const file of ['app/index.tsx', 'app/entry.tsx', 'app/period.tsx']) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(source, /<ComingSoonScan/);
    assert.ok(!source.includes('router.push("/scan")'));
  }
  const scan = fs.readFileSync(path.join(root, 'app/scan.tsx'), 'utf8');
  const activeRoute = scan.split('// Retained for future OCR integration')[0];
  assert.match(activeRoute, /<ComingSoonScan/);
  assert.doesNotMatch(activeRoute, /launchCameraAsync\(|launchImageLibraryAsync\(|requestCameraPermissionsAsync\(/);
});

test('typed clock input accepts AM/PM and 24-hour formats including exact minutes', () => {
  const { parseTimeInput } = load('src/lib/timeFormat.ts');
  for (const [text, expected] of [['7:30 AM', '07:30'], ['3:45PM', '15:45'], ['  7:13 am  ', '07:13'], ['15:45', '15:45'], ['0:01', '00:01'], ['12:00 AM', '00:00'], ['12:00 PM', '12:00'], ['11:59 PM', '23:59']]) {
    assert.equal(parseTimeInput(text), expected);
  }
});
test('typed clock input rejects blank, partial and out-of-range times', () => {
  const { parseTimeInput } = load('src/lib/timeFormat.ts');
  for (const text of ['', ' ', '7', '7:', '7:3', '7:30 A', '24:00', '07:60', '13:00 PM', '00:30 AM', '7:30 XM', '-1:00', '15:45:10']) {
    assert.equal(parseTimeInput(text), null, text);
  }
});
test('every minute round-trips through AM/PM display without rounding', () => {
  const { parseTimeInput, formatTime12h } = load('src/lib/timeFormat.ts');
  for (let minute = 0; minute < 1440; minute++) {
    const time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
    assert.equal(parseTimeInput(formatTime12h(time)), time);
  }
});
test('typed and dropdown time values produce identical pay and overtime results', () => {
  const { parseTimeInput } = load('src/lib/timeFormat.ts');
  const { calculateEntry } = load('src/lib/overtime.ts');
  const shift = { ...entry, clockIn: '06:13', clockOut: '16:27' };
  const typed = { ...shift, clockIn: parseTimeInput('6:13 AM'), clockOut: parseTimeInput('4:27 PM') };
  assert.deepEqual(calculateEntry(typed, 25, 1.5), calculateEntry(shift, 25, 1.5));
});

test('web delete confirmation respects OK and Cancel without using native Alert', async () => {
  const originalWindow = global.window;
  let confirmResult = false; let prompt;
  global.window = { confirm: message => { prompt = message; return confirmResult; } };
  try {
    const dialog = loader({ 'react-native': { Platform: { OS: 'web' }, Alert: { alert: () => assert.fail('Web must not use Alert.alert') } } })('src/lib/confirmEntryDeletion.ts');
    assert.equal(await dialog.confirmEntryDeletion(), false);
    confirmResult = true;
    assert.equal(await dialog.confirmEntryDeletion(), true);
    assert.match(prompt, /permanently remove/);
  } finally { if (originalWindow === undefined) delete global.window; else global.window = originalWindow; }
});
test('web static rendering cannot approve deletion', async () => {
  const dialog = loader({ 'react-native': { Platform: { OS: 'web' }, Alert: {} } })('src/lib/confirmEntryDeletion.ts');
  assert.equal(await dialog.confirmEntryDeletion(), false);
});
test('native confirmation preserves Delete, Cancel and dismiss behavior', async () => {
  let buttons, options;
  const dialog = loader({ 'react-native': { Platform: { OS: 'android' }, Alert: {
    alert: (_title, _message, b, o) => { buttons = b; options = o; }
  } } })('src/lib/confirmEntryDeletion.ts');
  const cancelled = dialog.confirmEntryDeletion(); buttons[0].onPress(); assert.equal(await cancelled, false);
  const deleted = dialog.confirmEntryDeletion(); buttons[1].onPress(); assert.equal(await deleted, true);
  assert.equal(buttons[1].style, 'destructive');
  const dismissed = dialog.confirmEntryDeletion(); options.onDismiss(); assert.equal(await dismissed, false);
});

test('shared projection includes notes but excludes every structured pay field', () => {
  const row = project(entry);
  assert.deepEqual(Object.keys(row).sort(), [...shared.sharedFields].sort());
  assert.equal(row.regularHours, 7.5); assert.equal(row.totalHours, 7.5);
  assert.equal(row.id, 'alice_shift%2F1');
  assert.equal(row.notes, entry.notes);
  assert.equal(row.hourlyRate, undefined); assert.equal(row.totalPay, undefined);
});

test('notes preserve multiline text, accept legacy records and reject non-text values', () => {
  const row = project({ ...entry, notes: 'Site A\nCompleted repairs' });
  assert.equal(shared.parseHours(row, row.id, row.teamId).notes, 'Site A\nCompleted repairs');
  const { notes, ...legacy } = row;
  assert.equal(shared.parseHours(legacy, row.id, row.teamId).notes, '');
  for (const notes of [null, 3, {}, []]) assert.throws(() => shared.parseHours({ ...row, notes }, row.id, row.teamId));
});

test('editing or clearing a note triggers a sync without changing calculated hours', () => {
  const row = project(entry); const previous = shared.planSync([row], {}).next;
  for (const notes of ['Changed', '']) {
    const updated = project({ ...entry, notes });
    assert.equal(shared.planSync([updated], previous).writes.length, 1);
    assert.equal(updated.totalHours, row.totalHours);
  }
});

test('registration validates confirmation before contacting Firebase and grants no membership', async () => {
  const calls = [];
  const { registerAccount } = loader({ 'firebase/auth': { createUserWithEmailAndPassword: async (...args) => { calls.push(args); return { user: { uid: 'new-user' } }; } } })('src/services/registration.ts');
  const auth = {};
  await assert.rejects(registerAccount(auth, 'invalid', 'secret123', 'secret123'), /valid email/);
  await assert.rejects(registerAccount(auth, 'new@example.com', 'short', 'short'), /at least 6/);
  await assert.rejects(registerAccount(auth, 'new@example.com', 'secret123', 'different'), /do not match/);
  assert.equal(calls.length, 0);
  assert.equal((await registerAccount(auth, ' new@example.com ', 'secret123', 'secret123')).user.uid, 'new-user');
  assert.deepEqual(calls, [[auth, 'new@example.com', 'secret123']]);
});
test('existing overtime boundaries and weekend rules preserved', () => {
  const row = project({ ...entry, clockIn: '06:00', clockOut: '16:00', breakMinutes: 0 });
  assert.equal(row.regularHours, 8); assert.equal(row.overtimeHours, 2);
  assert.equal(project({ ...entry, date: '2026-08-29' }).overtimeHours, 7.5);
});
test('reject impossible dates, invalid times, non-finite and excessive breaks', () => {
  for (const change of [{ date: '2026-02-30' }, { clockIn: '25:00' }, { clockOut: '3 PM' }, { breakMinutes: NaN }, { breakMinutes: 500 }, { breakMinutes: -1 }]) {
    assert.throws(() => project({ ...entry, ...change }));
  }
});
test('response parser rejects any unexpected field including pay', () => {
  const row = project(entry);
  assert.deepEqual(shared.parseHours(row, row.id, row.teamId), row);
  assert.throws(() => shared.parseHours({ ...row, hourlyRate: 20 }, row.id, row.teamId));
  assert.throws(() => shared.parseHours(row, row.id, 'other-team'));
});
test('sync is stable across timestamps and isolates deletion to local manifest', () => {
  const row = project(entry); const first = shared.planSync([row], {});
  assert.equal(first.writes.length, 1);
  assert.equal(shared.planSync([{ ...row, updatedAt: 'later' }], first.next).writes.length, 0);
  assert.deepEqual(shared.planSync([], first.next).deletes, [row.id]);
  assert.deepEqual(shared.planSync([], {}).deletes, []);
});
test('legacy claim preserves entries, cards, settings and active clock without deleting originals', async () => {
  const store = memory();
  const keys = ['tpt_entries_v1_1', 'tpt_settings_v1_1', 'tpt_active_clock_v1', 'tpt_time_cards_v1'];
  for (const key of keys) store.data.set(key, JSON.stringify({ source: key }));
  const isolated = loader({ '@react-native-async-storage/async-storage': store });
  const scope = isolated('src/lib/storageScope.ts');
  assert.equal(await scope.hasUnclaimedData(), true);
  await scope.selectStorageScope('alice', true);
  for (const key of keys) assert.equal(store.data.get(scope.privateKey(key)), store.data.get(key));
  assert.equal(await scope.hasUnclaimedData(), false);
  await assert.rejects(scope.selectStorageScope('bob', true));
  await scope.selectStorageScope('bob');
  for (const key of keys) assert.equal(await store.getItem(scope.privateKey(key)), null);
  await scope.selectStorageScope(null);
  assert.match(scope.privateKey(keys[0]), /:guest$/);
});
test('private account storage switches safely and does not leak saved pay or sessions', async () => {
  const store = memory(); const isolated = loader({ '@react-native-async-storage/async-storage': store });
  const scope = isolated('src/lib/storageScope.ts'); const storage = isolated('src/lib/storage.ts');
  await scope.selectStorageScope('alice');
  await storage.saveEntries([entry]);
  await storage.saveSettings({ hourlyRate: 90, overtimeMultiplier: 1.5, periodStart: '2026-08-24' });
  await storage.saveActiveClock({ date: entry.date, clockIn: '07:00', breakMinutes: 0 });
  await scope.selectStorageScope('bob');
  assert.deepEqual(await storage.loadEntries(), []);
  assert.equal((await storage.loadSettings()).hourlyRate, 25);
  assert.equal(await storage.loadActiveClock(), null);
  await scope.selectStorageScope('alice');
  assert.equal((await storage.loadEntries()).length, 1);
  assert.equal((await storage.loadSettings()).hourlyRate, 90);
  assert.equal((await storage.loadActiveClock()).clockIn, '07:00');
});
test('legacy migration is idempotent and never overwrites newer account data', async () => {
  const store = memory(); store.data.set('tpt_entries_v1_1', '["old"]');
  store.data.set('tpt_entries_v1_1:user:alice', '["new"]');
  const scope = loader({ '@react-native-async-storage/async-storage': store })('src/lib/storageScope.ts');
  await scope.selectStorageScope('alice', true);
  assert.equal(await store.getItem(scope.privateKey('tpt_entries_v1_1')), '["new"]');
});
test('scope guard cancels operations after account changes, including switching back', async () => {
  const store = memory();
  const scope = loader({ '@react-native-async-storage/async-storage': store })('src/lib/storageScope.ts');
  await scope.selectStorageScope('alice');
  const valid = scope.captureStorageScope();
  assert.equal(valid(), true);
  await scope.selectStorageScope('bob');
  assert.equal(valid(), false);
  await scope.selectStorageScope('alice');
  assert.equal(valid(), false);
});
test('sync journal retries ambiguous commits and deletes only its own known entries', async () => {
  const store = memory(); const calls = []; let fail = true;
  const api = {
    doc: (_db, ...segments) => segments.join('/'),
    writeBatch: () => { const writes = []; return {
      set: (ref, value) => writes.push({ ref, value }), delete: ref => writes.push({ ref, deleted: true }),
      commit: async () => { calls.push(writes); if (fail) throw new Error('network failure'); }
    }; }
  };
  const service = loader({ '@react-native-async-storage/async-storage': store,
    'firebase/firestore': api, './firebase': { getFirebase: () => ({ db: {}, auth: { currentUser: { uid: 'alice' } } }) }
  })('src/services/firestoreTeam.ts');
  const member = { displayName: 'Alice', role: 'member', active: true };
  await assert.rejects(service.publishLocalHours('alice', member, [entry], () => false));
  const journal = JSON.parse([...store.data.values()][0]);
  assert.equal(journal.touched.length, 1);
  fail = false;
  // User removed the entry while offline. The unresolved server write is removed.
  await service.publishLocalHours('alice', member, [], () => false);
  assert.equal(calls[1][0].deleted, true);
  assert.equal(calls[1][0].ref, calls[0][0].ref);
  await service.publishLocalHours('alice', member, [], () => false);
  assert.equal(calls.length, 2);
});
test('rules artifact has strict field allowlist and existing-owner update check (not emulator validation)', () => {
  const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
  assert.match(rules, /hasOnly/);
  assert.match(rules, /allow update: if member\(teamId\) && resource.data.userId == request.auth.uid/);
  assert.match(rules, /allow list, create, update, delete: if false/);
  assert.match(rules, /data.active == true/);
});
