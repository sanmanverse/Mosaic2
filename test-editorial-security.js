import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const app = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8');
const schema = fs.readFileSync(path.join(root, 'supabase/schema.sql'), 'utf8');
const auth = fs.readFileSync(path.join(root, 'src/lib/supabase.js'), 'utf8');

test('writer editor supports five editorial themes and photo galleries', () => {
  for (const theme of ['classic','modern','atelier','fieldnotes','noir']) assert.match(app, new RegExp(theme));
  assert.match(app, /multiple disabled=\{!signedIn\|\|uploading\}/);
  assert.match(schema, /image_urls text\[\]/);
  assert.match(schema, /theme_key text/);
});

test('authentication supports Google OAuth, email password and SMS OTP', () => {
  assert.match(app, /signInWithOAuth\(\{provider:'google'/);
  assert.match(app, /signInWithPassword/);
  assert.match(app, /signInWithOtp\(\{phone/);
  assert.match(app, /verifyOtp\(\{phone/);
});

test('browser client uses only the public anon key variable', () => {
  assert.match(auth, /VITE_SUPABASE_ANON_KEY/);
  assert.doesNotMatch(auth, /SERVICE_ROLE|service_role|SUPABASE_SECRET/);
});

test('no common live credential patterns are embedded in application source', () => {
  const files = ['src/App.jsx','src/main.jsx','src/lib/supabase.js','supabase/schema.sql','supabase/functions/delete-account/index.ts'];
  const suspicious = [/AIza[0-9A-Za-z_-]{20,}/, /sk_live_[0-9A-Za-z]{16,}/, /sb_secret_[A-Za-z0-9_-]{20,}/, /ghp_[A-Za-z0-9]{30,}/];
  for (const file of files) {
    const content = fs.readFileSync(path.join(root,file),'utf8');
    for (const pattern of suspicious) assert.doesNotMatch(content, pattern, `${file} contains a credential-like value`);
  }
  assert.equal(fs.existsSync(path.join(root,'.env')), false);
});
