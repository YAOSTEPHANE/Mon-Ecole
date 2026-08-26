import assert from 'node:assert/strict';
import { describe, it, before } from 'node:test';

describe('upload access tokens', () => {
  const rel = '/uploads/identity-documents/test-doc.pdf';
  let signUploadAccessToken: typeof import('./upload-access-token.util').signUploadAccessToken;
  let verifyUploadAccessToken: typeof import('./upload-access-token.util').verifyUploadAccessToken;
  let withUploadAccessQuery: typeof import('./upload-access-token.util').withUploadAccessQuery;

  before(async () => {
    process.env.JWT_SECRET =
      process.env.JWT_SECRET?.trim() && process.env.JWT_SECRET.trim().length >= 32
        ? process.env.JWT_SECRET
        : 'test-jwt-secret-for-unit-tests-only-32chars';
    const mod = await import('./upload-access-token.util');
    signUploadAccessToken = mod.signUploadAccessToken;
    verifyUploadAccessToken = mod.verifyUploadAccessToken;
    withUploadAccessQuery = mod.withUploadAccessQuery;
  });

  it('signe et vérifie un jeton valide', () => {
    const token = signUploadAccessToken(rel);
    assert.match(token, /^\d+\.[A-Za-z0-9_-]+$/);
    assert.equal(verifyUploadAccessToken(rel, token), true);
  });

  it('refuse un jeton sur un autre chemin', () => {
    const token = signUploadAccessToken(rel);
    assert.equal(verifyUploadAccessToken('/uploads/other/file.pdf', token), false);
  });

  it('ajoute ?access= sur les fichiers sensibles', () => {
    const url = 'http://localhost:5000/uploads/identity-documents/a.pdf';
    const signed = withUploadAccessQuery(url);
    assert.match(signed, /access=/);
    const avatarUrl = 'http://localhost:5000/uploads/avatars/a.png';
    assert.equal(withUploadAccessQuery(avatarUrl), avatarUrl);
  });
});
