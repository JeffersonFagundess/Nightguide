const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const vm = require('node:vm');

const userId = 'b1000000-0000-4000-8000-000000000001';
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
function loadTs(relative, mocks = {}) {
  const filename = path.join(__dirname, '..', relative);
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function(require, module, exports) { ${source}\n})`, { filename })(name => {
    if (!(name in mocks)) throw new Error(`Unexpected dependency: ${name}`);
    return mocks[name];
  }, module, module.exports);
  return module.exports;
}
const helpers = loadTs('src/lib/public-profile-data.ts');

function setup(store = new Map(), files = new Map()) {
  const state = {
    queries: [], downloads: [], error: null, imageError: false,
    row: { id: userId, full_name: 'Jefferson', bio: 'Gosto de praia', avatar_url: 'https://example.test/avatar-v1.jpg', cover_url: 'https://example.test/cover-v1.jpg' },
  };
  class Directory {
    constructor(...parts) { this.uri = parts.map(part => typeof part === 'string' ? part : part.uri).join('/'); }
    create() {}
  }
  class File extends Directory {
    get exists() { return files.has(this.uri); }
    get size() { return files.get(this.uri)?.length || 0; }
    write(bytes) { files.set(this.uri, bytes); }
  }
  const api = loadTs('src/lib/public-profiles.ts', {
    'expo-file-system': { Directory, File, Paths: { document: 'file:///document' } },
    'expo/fetch': { fetch: async url => {
      state.downloads.push(url);
      if (state.imageError) throw new Error('offline');
      return { ok: true, headers: { get: key => key === 'content-type' ? 'image/jpeg' : '4' }, arrayBuffer: async () => new ArrayBuffer(4) };
    } },
    '@/src/lib/public-profile-data': helpers,
    '@/src/lib/storage': {
      isUuid: id => /^[0-9a-f-]{36}$/i.test(id || ''),
      readJson: async (key, fallback) => clone(store.has(key) ? store.get(key) : fallback),
      writeJson: async (key, value) => { store.set(key, clone(value)); },
    },
    '@/src/lib/supabase': { supabase: {
      from: table => {
        assert.equal(table, 'author_profiles', 'Never query private profiles or auth users');
        const query = { table };
        state.queries.push(query);
        const builder = {
          select: fields => { query.fields = fields; return builder; },
          eq: (column, id) => { query.id = id; assert.equal(column, 'id'); return builder; },
          in: (column, ids) => { query.ids = ids; assert.equal(column, 'id'); return builder; },
          abortSignal: () => builder,
          maybeSingle: async () => ({ data: state.row, error: state.error }),
          then: resolve => Promise.resolve({ data: state.row ? [state.row] : [], error: state.error }).then(resolve),
        };
        return builder;
      },
    } },
  });
  return { api, state, store, files };
}

test('public data is an explicit allowlist and never copies private account fields', () => {
  const row = { id: userId, full_name: 'Jefferson', bio: 'Praia', avatar_url: 'https://example.test/a.jpg', cover_url: 'https://example.test/c.jpg', email: 'private@example.test', phone: 'secret', role: 'admin', access_token: 'secret' };
  assert.deepEqual(Object.keys(helpers.publicProfileFromRow(row)).sort(), ['avatarUrl', 'bio', 'coverUrl', 'fullName', 'id']);
  const own = helpers.publicProfileFromOwn({ id: userId, fullName: 'Jefferson', bio: 'Praia', role: 'admin', email: 'private@example.test', pendingActionId: 'private', avatarLocalUri: 'file:///avatar.jpg' });
  assert.equal(own.avatarLocalUri, 'file:///avatar.jpg');
  assert.equal(JSON.stringify(own).includes('private'), false);
  assert.equal('role' in own, false);
});

test('legacy email defaults and invalid image URLs are not exposed publicly', () => {
  assert.equal(helpers.publicAuthorName('person@example.test'), 'NightGuide');
  assert.equal(helpers.publicAuthorName('   '), 'NightGuide');
  assert.equal(helpers.publicAuthorName(' Jefferson '), 'Jefferson');
  const profile = helpers.publicProfileFromRow({ id: userId, full_name: 'person@example.test', avatar_url: 'file:///private.jpg', cover_url: 'javascript:alert(1)' });
  assert.equal(profile.avatarUrl, undefined);
  assert.equal(profile.coverUrl, undefined);
  assert.equal(profile.fullName, 'NightGuide');
});

test('signed-out public fetch saves bio, avatar and cover for offline reopening', async () => {
  const first = setup();
  const profile = await first.api.fetchPublicProfile(userId);
  assert.equal(profile.bio, 'Gosto de praia');
  assert.ok(profile.avatarLocalUri.startsWith('file:///document/public-profile-media/'));
  assert.ok(profile.coverLocalUri.startsWith('file:///document/public-profile-media/'));
  assert.equal(first.state.queries[0].fields, 'id,full_name,avatar_url,cover_url,bio');
  const reopened = setup(first.store, first.files);
  assert.deepEqual(await reopened.api.readCachedPublicProfile(userId), clone(profile));
  reopened.state.error = new Error('offline');
  await assert.rejects(reopened.api.fetchPublicProfile(userId));
  assert.equal((await reopened.api.readCachedPublicProfile(userId)).coverLocalUri, profile.coverLocalUri);
});

test('old posts use the current public avatar with one batch query per feed', async () => {
  const { api, state } = setup();
  const posts = [{ id: 'one', userId, authorName: 'Old name', authorAvatarUrl: 'https://example.test/old.jpg' }, { id: 'two', userId }];
  const next = await api.attachPublicAuthors(posts);
  assert.equal(next[0].authorName, 'Jefferson');
  assert.equal(next[0].authorAvatarUrl, state.row.avatar_url);
  assert.equal(next[1].authorAvatarLocalUri, next[0].authorAvatarLocalUri);
  assert.deepEqual(state.queries[0].ids, [userId]);
  assert.equal(state.queries.length, 1);
  assert.equal(state.downloads.length, 1, 'Only avatar is downloaded until the public profile is opened');
  assert.equal('bio' in next[0], false, 'Bio and cover stay behind the profile click');
});

test('changing avatar or cover URL cannot reuse a stale cached photo', async () => {
  const { api, state } = setup();
  const old = await api.fetchPublicProfile(userId);
  state.row.avatar_url = 'https://example.test/avatar-v2.jpg';
  state.row.cover_url = 'https://example.test/cover-v2.jpg';
  state.row.bio = 'Nova descrição';
  const next = await api.fetchPublicProfile(userId);
  assert.notEqual(next.avatarLocalUri, old.avatarLocalUri);
  assert.notEqual(next.coverLocalUri, old.coverLocalUri);
  assert.equal(next.bio, 'Nova descrição');
  state.row.avatar_url = null;
  const cleared = await api.fetchPublicProfile(userId);
  assert.equal(cleared.avatarUrl, undefined);
  assert.equal(cleared.avatarLocalUri, undefined);
});

test('reviews retain cached author photos offline without calling the server', async () => {
  const { api, state } = setup();
  const profile = await api.fetchPublicProfile(userId);
  state.queries = [];
  state.error = new Error('offline');
  const next = await api.attachPublicAuthors([{ userId, authorName: 'Before' }], false);
  assert.equal(next[0].authorAvatarLocalUri, profile.avatarLocalUri);
  assert.equal(next[0].authorName, 'Jefferson');
  assert.equal(state.queries.length, 0);
  const fallback = await api.attachPublicAuthors([{ userId, authorName: 'Before' }]);
  assert.equal(fallback[0].authorAvatarLocalUri, profile.avatarLocalUri);
});

test('demo authors do not query public accounts and a deleted account clears its cache', async () => {
  const { api, state } = setup();
  const demo = { userId: 'demo-user', authorName: 'Camila (exemplo)', isDemo: true };
  assert.deepEqual(await api.attachPublicAuthors([demo]), [demo]);
  assert.equal(await api.fetchPublicProfile('demo-user'), null);
  assert.equal(state.queries.length, 0);
  await api.fetchPublicProfile(userId);
  state.row = null;
  assert.equal(await api.fetchPublicProfile(userId), null);
  assert.equal(await api.readCachedPublicProfile(userId), null);
});

test('failed new image download keeps the new URL, not an old photo', async () => {
  const { api, state } = setup();
  await api.fetchPublicProfile(userId);
  state.imageError = true;
  state.row.avatar_url = 'https://example.test/new.jpg';
  const next = await api.fetchPublicProfile(userId);
  assert.equal(next.avatarUrl, state.row.avatar_url);
  assert.equal(next.avatarLocalUri, undefined);
  assert.equal(next.bio, 'Gosto de praia');
});
