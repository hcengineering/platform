//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { splitOidcName } from './oidcNameSplit'

describe('splitOidcName', () => {
  // Case 1 — the bug we are fixing.
  it('handles Authentik-default shape (given_name === full name, family_name blank)', () => {
    expect(
      splitOidcName({
        name: 'Florian Preininger',
        given_name: 'Florian Preininger',
        family_name: ''
      })
    ).toEqual({ first: 'Florian', last: 'Preininger' })
  })

  // Case 2 — conformant IdP unchanged.
  it('keeps conformant IdP claims as-is (given+family present and distinct)', () => {
    expect(
      splitOidcName({
        name: 'Florian Preininger',
        given_name: 'Florian',
        family_name: 'Preininger'
      })
    ).toEqual({ first: 'Florian', last: 'Preininger' })
  })

  // Case 3 — single-name user, conformant claims.
  it('handles single-name user with given_name only', () => {
    expect(
      splitOidcName({
        name: 'Cher',
        given_name: 'Cher',
        family_name: ''
      })
    ).toEqual({ first: 'Cher', last: '' })
  })

  // Case 4 — strict heuristic does NOT trigger; legitimate compound surname preserved.
  it('preserves legitimate compound surname when family_name is present', () => {
    expect(
      splitOidcName({
        name: 'Anna Lena Schmidt',
        given_name: 'Anna',
        family_name: 'Lena Schmidt'
      })
    ).toEqual({ first: 'Anna', last: 'Lena Schmidt' })
  })

  // Case 5 — whitespace tolerance on all inputs.
  it('trims surrounding whitespace before comparing/splitting', () => {
    expect(
      splitOidcName({
        name: '  Florian Preininger  ',
        given_name: '  Florian Preininger  ',
        family_name: ''
      })
    ).toEqual({ first: 'Florian', last: 'Preininger' })
  })

  // Case 6 — falls back to username when name is missing.
  it('falls back to username when name is missing', () => {
    expect(
      splitOidcName({
        name: undefined,
        username: 'asmith',
        given_name: '',
        family_name: ''
      })
    ).toEqual({ first: 'asmith', last: '' })
  })

  // Case 7 — strict heuristic with single-name doesn't degrade.
  it('does not degrade single-name user when Authentik-default heuristic triggers', () => {
    // Same as case 3; verifies that nameParts.slice(1) returns '' (no crash).
    expect(
      splitOidcName({
        name: 'Cher',
        given_name: 'Cher',
        family_name: ''
      })
    ).toEqual({ first: 'Cher', last: '' })
  })

  // Case 8 — compound first name from conformant IdP.
  it('preserves compound first name from conformant IdP', () => {
    expect(
      splitOidcName({
        name: 'Mary Beth Smith',
        given_name: 'Mary Beth',
        family_name: 'Smith'
      })
    ).toEqual({ first: 'Mary Beth', last: 'Smith' })
  })

  // Case 9 — empty everything must not crash.
  it('handles empty inputs without crashing', () => {
    expect(
      splitOidcName({
        name: '',
        given_name: '',
        family_name: ''
      })
    ).toEqual({ first: '', last: '' })
  })

  // Case 10 — multiple internal whitespace collapses via split regex.
  it('collapses multiple internal whitespace via split regex', () => {
    expect(
      splitOidcName({
        name: 'Anna  Bertha   Christine',
        given_name: '',
        family_name: ''
      })
    ).toEqual({ first: 'Anna', last: 'Bertha Christine' })
  })
})
