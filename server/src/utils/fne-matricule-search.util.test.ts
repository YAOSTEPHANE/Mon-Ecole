import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  parseFneSearchResults,
  toFneDateFormat,
} from './fne-matricule-search.util';

describe('fne-matricule-search.util', () => {
  it('converts ISO dates to FNE dd-mm-yyyy', () => {
    assert.equal(toFneDateFormat('2010-05-12'), '12-05-2010');
    assert.equal(toFneDateFormat('12-05-2010'), '12-05-2010');
    assert.equal(toFneDateFormat('12/05/2010'), '12-05-2010');
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
