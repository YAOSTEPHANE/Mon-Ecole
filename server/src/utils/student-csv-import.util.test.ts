import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseStudentBirthDate,
  parseStudentImportCsv,
} from './student-csv-import.util';

test('parseStudentBirthDate accepte JJ/MM/AAAA et ISO', () => {
  const fr = parseStudentBirthDate('15/03/2012');
  assert.ok(fr);
  assert.equal(fr!.getUTCFullYear(), 2012);
  assert.equal(fr!.getUTCMonth(), 2);
  assert.equal(fr!.getUTCDate(), 15);

  const iso = parseStudentBirthDate('2012-03-15');
  assert.ok(iso);
  assert.equal(iso!.getUTCDate(), 15);
});

test('parseStudentImportCsv lit le modèle et mappe les colonnes', () => {
  const csv = `N° élève;Nom;Prénom;Date naissance;Genre;Email;Mot de passe;Classe
ELV001;Dupont;Alice;15/03/2012;F;a@b.com;MotDePasse1!;6ème A
ELV002;Koné;Ibrahim;22/07/2011;M;;MotDePasse1!;6ème A`;
  const rows = parseStudentImportCsv(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].studentId, 'ELV001');
  assert.equal(rows[0].gender, 'FEMALE');
  assert.equal(rows[1].gender, 'MALE');
  assert.equal(rows[1].email, null);
});
