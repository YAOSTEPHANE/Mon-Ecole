import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildFneYearOptions,
  mergeFneYearOptions,
  parseFneSearchResults,
  toFneDateFormat,
} from './fne-matricule-search.util';

describe('fne-matricule-search.util', () => {
  it('converts ISO dates to FNE dd-mm-yyyy', () => {
    assert.equal(toFneDateFormat('2010-05-12'), '12-05-2010');
    assert.equal(toFneDateFormat('12-05-2010'), '12-05-2010');
    assert.equal(toFneDateFormat('12/05/2010'), '12-05-2010');
  });

  it('builds all academic years from 2010 through current+1', () => {
    const years = buildFneYearOptions(2010, 2025);
    assert.equal(years[0]?.value, '1011');
    assert.equal(years[0]?.label, 'Fichier 2010-2011');
    assert.ok(years.some((y) => y.value === '2425'));
    assert.equal(years[years.length - 1]?.value, '2526');
    assert.ok(years.length >= 16);
  });

  it('merges scraped portal years with the full range', () => {
    const merged = mergeFneYearOptions(
      [
        { value: '1617', label: 'Fichier 2016-2017' },
        { value: '1819', label: 'Fichier 2018-2019' },
      ],
      buildFneYearOptions(2016, 2020)
    );
    assert.ok(merged.some((y) => y.value === '1617'));
    assert.ok(merged.some((y) => y.value === '1718'));
    assert.ok(merged.some((y) => y.value === '1920'));
    assert.ok(merged.some((y) => y.value === '2021'));
  });

  it('parses secondary FNE result rows', () => {
    const html = `
      <table><tbody>
        <tr>
          <td>
            <h5>KOUASSI TEHIA ADJOUA SYLVIE</h5>
            <h6>Matricule: <span class="badge new">00012794F</span></h6>
            <p>
              Né(e) le 28-12-1987 à AMELEKIA <br>
              Père: YOBOUET KOUASSI - Mère: KOUAME AHOU <br>
              Etablissement: COLLEGE IMES BROUKRO BOUAKE
              Code: 017152
            </p>
          </td>
        </tr>
      </tbody></table>
    `;
    const rows = parseFneSearchResults(html, '1819');
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.matricule, '00012794F');
    assert.equal(rows[0]?.fullName, 'KOUASSI TEHIA ADJOUA SYLVIE');
    assert.equal(rows[0]?.dateOfBirth, '28-12-1987');
    assert.equal(rows[0]?.birthPlace, 'AMELEKIA');
    assert.equal(rows[0]?.establishmentCode, '017152');
  });
});
