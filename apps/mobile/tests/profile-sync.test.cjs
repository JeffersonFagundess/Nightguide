const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const vm = require('node:vm');

const userId = 'b1000000-0000-4000-8000-000000000001';
const profileKey = `nightguide:profile:${userId}`;
const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

function loadTs(relative, mocks = {}) {
  const filename = path.join(__dirname, '..', relative);
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const run = vm.runInThisContext(`(function(require, module, exports) { ${source}\n})`, { filename });
  run((name) => {
    if (!(name in mocks)) throw new Error(`Unexpected dependency: ${name}`);
    return mocks[name];
  }, module, module.exports);
  return module.exports;
}

const helpers = loadTs('src/lib/profile-data.ts');

function setup(store = new Map()) {
  const state = { online: true, uploadError: null, updateError: null, noRow: false, uploads: [], updates: [], deleted: [], onUpdate: null };
  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id: userId } }, error: null }) },
    storage: { from: () => ({
      upload: async (path, body, options) => {
        state.uploads.push({ path, body, options });
        return { error: state.uploadError };
      },
      getPublicUrl: (path) => ({ data: { publicUrl: `https://example.test/${path}` } }),
    }) },
    from: (table) => {
      assert.equal(table, 'profiles');
      return { update: (values) => {
        state.updates.push(values);
        return { eq: (column, id) => {
          assert.equal(column, 'id');
          assert.equal(id, userId);
          return { select: () => ({ single: async () => {
            if (state.onUpdate) await state.onUpdate();
            return { error: state.updateError, data: state.noRow ? null : { id: userId, role: 'customer', full_name: 'Before', bio: '', avatar_url: 'https://example.test/old.jpg', cover_url: null, ...values } };
          } }) };
        } };
      } };
    },
  };
  const sync = loadTs('src/lib/offline-sync.ts', {
    '@react-native-async-storage/async-storage': { getItem: async () => null },
    'expo-network': { getNetworkStateAsync: async () => ({ isConnected: state.online, isInternetReachable: state.online }) },
    '@/src/lib/profile-data': helpers,
    '@/src/lib/review-media': {
      readReviewPhoto: async () => new ArrayBuffer(4),
      extensionFor: (mime) => mime === 'image/png' ? 'png' : 'jpg',
      deletePersistedReviewPhoto: (uri) => state.deleted.push(uri),
    },
    '@/src/lib/storage': {
      readJson: async (key, fallback) => clone(store.has(key) ? store.get(key) : fallback),
      writeJson: async (key, value) => { store.set(key, clone(value)); },
      scopedKey: (key, id) => `${key}:${id}`,
      isUuid: (id) => /^[0-9a-f-]{36}$/i.test(id),
    },
    '@/src/lib/supabase': { supabase },
  });
  const enqueue = (id, payload, owner = userId) => sync.queueOfflineAction({ id, type: 'profile_updated', userId: owner, entityId: owner, payload: { fullName: 'Jefferson', ...payload } });
  return { sync, state, store, enqueue };
}

test('offline text edits preserve queued avatar and cover after reopening', async () => {
  const first = setup();
  first.state.online = false;
  await first.enqueue('first', { bio: 'Before', avatarPhotoUri: 'file:///avatar.jpg', coverPhotoUri: 'file:///cover.jpg' });
  assert.equal((await first.sync.syncOfflineActions()).synced, 0);
  const reopened = setup(first.store);
  await reopened.enqueue('second', { bio: 'Updated' });
  const [pending] = await reopened.sync.getOfflineActions();
  assert.equal(pending.payload.avatarPhotoUri, 'file:///avatar.jpg');
  assert.equal(pending.payload.coverPhotoUri, 'file:///cover.jpg');
  assert.equal(pending.payload.bio, 'Updated');
  assert.deepEqual(reopened.state.deleted, []);
  const result = await reopened.sync.syncOfflineActions();
  assert.equal(result.synced, 1);
  assert.equal(reopened.state.uploads.length, 2);
  assert.equal(reopened.state.updates[0].bio, 'Updated');
});

test('each new photo has a new URL and the server result updates the local cache', async () => {
  const { enqueue, sync, store, state } = setup();
  for (const id of ['first', 'second']) {
    store.set(profileKey, { id: userId, role: 'customer', fullName: 'Jefferson', avatarLocalUri: `file:///${id}.jpg`, pendingActionId: id });
    await enqueue(id, { avatarPhotoUri: `file:///${id}.jpg`, bio: 'My description' });
    assert.equal((await sync.syncOfflineActions()).synced, 1);
    assert.equal(store.get(profileKey).pendingActionId, undefined);
    assert.equal(store.get(profileKey).bio, 'My description');
    assert.equal(store.get(profileKey).avatarLocalUri, `file:///${id}.jpg`);
  }
  assert.notEqual(state.updates[0].avatar_url, state.updates[1].avatar_url);
  assert.equal((await sync.getOfflineActions()).length, 0);
});

test('editing only text never clears an existing avatar or cover; a bio can be cleared', async () => {
  const { enqueue, sync, state } = setup();
  await enqueue('text', { bio: '' });
  await sync.syncOfflineActions();
  assert.equal(state.updates[0].bio, '');
  assert.equal(Object.hasOwn(state.updates[0], 'avatar_url'), false);
  assert.equal(Object.hasOwn(state.updates[0], 'cover_url'), false);
});

test('upload errors remain pending and are not reported as synchronized', async () => {
  const { enqueue, sync, state } = setup();
  state.uploadError = { message: 'Storage rejected the photo' };
  await enqueue('failed', { avatarPhotoUri: 'file:///avatar.jpg' });
  const result = await sync.syncOfflineActions();
  assert.equal(result.synced, 0);
  assert.equal(result.failed, 1);
  assert.equal((await sync.getOfflineActions())[0].lastError, state.uploadError.message);
  assert.equal(state.updates.length, 0);
  state.uploadError = null;
  assert.equal((await sync.syncOfflineActions()).synced, 1);
});

test('a zero-row profile update is a failure, never a false success', async () => {
  const { enqueue, sync, state } = setup();
  state.noRow = true;
  await enqueue('missing', { bio: 'Description' });
  assert.equal((await sync.syncOfflineActions()).failed, 1);
  assert.equal((await sync.getOfflineActions()).length, 1);
});

test('loading remote data cannot overwrite offline edits or an intentionally empty bio', () => {
  const remote = { id: userId, fullName: 'Old name', role: 'customer', bio: 'Old bio', avatarUrl: 'https://example.test/old.jpg' };
  const local = { ...remote, fullName: 'New name', bio: '', avatarLocalUri: 'file:///new.jpg' };
  const pending = { id: 'new', payload: { fullName: 'New name', bio: '', avatarPhotoUri: 'file:///new.jpg' }, lastError: 'Upload failed' };
  const result = helpers.profileFromRemote(remote, local, pending);
  assert.equal(result.fullName, 'New name');
  assert.equal(result.bio, '');
  assert.equal(result.avatarLocalUri, 'file:///new.jpg');
  assert.equal(result.syncError, 'Upload failed');
});

test('an old synchronization finishing late cannot overwrite a newer edit', async () => {
  const { enqueue, sync, store, state } = setup();
  await enqueue('old', { bio: 'Old' });
  store.set(profileKey, { id: userId, role: 'customer', fullName: 'New', bio: 'New', pendingActionId: 'new' });
  state.onUpdate = async () => { state.onUpdate = null; await enqueue('new', { fullName: 'New', bio: 'New' }); };
  await sync.syncOfflineActions();
  assert.equal(store.get(profileKey).bio, 'New');
  assert.equal(store.get(profileKey).pendingActionId, 'new');
  assert.equal((await sync.getOfflineActions())[0].id, 'new');
});

test('concurrent queue writes are not lost and another account cannot sync these edits', async () => {
  const { enqueue, sync, state } = setup();
  const other = 'b1000000-0000-4000-8000-000000000002';
  await Promise.all([enqueue('mine', { bio: 'Mine' }), enqueue('theirs', { bio: 'Theirs' }, other)]);
  assert.equal((await sync.getOfflineActions()).length, 2);
  await sync.syncOfflineActions();
  assert.equal(state.updates.length, 1);
  assert.equal((await sync.getOfflineActions())[0].userId, other);
});

test('a replacement avatar does not reuse a previously queued photo', () => {
  const result = helpers.mergeProfilePayload({ fullName: 'Name', avatarPhotoUri: 'file:///old.jpg', avatarMimeType: 'image/jpeg', coverPhotoUri: 'file:///cover.jpg' }, { avatarPhotoUri: 'file:///new.png', avatarMimeType: 'image/png' });
  assert.equal(result.avatarPhotoUri, 'file:///new.png');
  assert.equal(result.avatarMimeType, 'image/png');
  assert.equal(result.coverPhotoUri, 'file:///cover.jpg');
});
