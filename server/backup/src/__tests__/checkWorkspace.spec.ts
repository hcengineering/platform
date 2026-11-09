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

import { compareDomainDigest, findMissingBlobs } from '../utils'

describe('compareDomainDigest', () => {
  it('reports nothing when workspace fully matches backup', () => {
    const backup = new Map([
      ['doc1', 'hash1'],
      ['doc2', 'hash2']
    ])
    const workspace = new Map([
      ['doc1', 'hash1'],
      ['doc2', 'hash2']
    ])
    expect(compareDomainDigest(backup, workspace)).toEqual({ missing: [], modified: [] })
  })

  it('reports documents present in backup but absent from workspace as missing', () => {
    const backup = new Map([
      ['doc1', 'hash1'],
      ['doc2', 'hash2']
    ])
    const workspace = new Map([['doc1', 'hash1']])
    expect(compareDomainDigest(backup, workspace)).toEqual({ missing: ['doc2'], modified: [] })
  })

  it('reports documents with a different hash as modified, not missing', () => {
    const backup = new Map([['doc1', 'hash1']])
    const workspace = new Map([['doc1', 'hash1-changed']])
    expect(compareDomainDigest(backup, workspace)).toEqual({ missing: [], modified: ['doc1'] })
  })

  it('ignores documents present in workspace but not in backup', () => {
    const backup = new Map([['doc1', 'hash1']])
    const workspace = new Map([
      ['doc1', 'hash1'],
      ['doc2', 'hash2']
    ])
    expect(compareDomainDigest(backup, workspace)).toEqual({ missing: [], modified: [] })
  })

  it('treats quoted and unquoted equal hashes as the same (matches restore hash trimming)', () => {
    const backup = new Map([['doc1', '"hash1"']])
    const workspace = new Map([['doc1', 'hash1']])
    expect(compareDomainDigest(backup, workspace)).toEqual({ missing: [], modified: [] })
  })

  it('returns an empty result for an empty backup digest', () => {
    const workspace = new Map([['doc1', 'hash1']])
    expect(compareDomainDigest(new Map(), workspace)).toEqual({ missing: [], modified: [] })
  })
})

describe('findMissingBlobs', () => {
  it('returns nothing when every backup blob exists in storage', () => {
    expect(findMissingBlobs(['blob1', 'blob2'], new Set(['blob1', 'blob2', 'blob3']))).toEqual([])
  })

  it('reports backup blobs absent from storage', () => {
    expect(findMissingBlobs(['blob1', 'blob2'], new Set(['blob1']))).toEqual(['blob2'])
  })

  it('reports all backup blobs when storage is empty', () => {
    expect(findMissingBlobs(['blob1', 'blob2'], new Set())).toEqual(['blob1', 'blob2'])
  })

  it('returns nothing for an empty list of backup blobs', () => {
    expect(findMissingBlobs([], new Set(['blob1']))).toEqual([])
  })
})
