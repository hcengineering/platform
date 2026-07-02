//
// Copyright © 2025 Hardcore Engineering Inc.
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

import {
  buildStoreZip,
  collectBackupFileNames,
  crc32,
  generateBackupScript,
  generateRestoreReadme
} from '../utils/backup'

describe('collectBackupFileNames', () => {
  it('returns the well-known root files when index is empty', () => {
    expect(collectBackupFileNames(undefined)).toEqual(['index.json', 'backup.json.gz', 'blob-info.json.gz'])
  })

  it('includes index files and snapshot files without duplicates', () => {
    const names = collectBackupFileNames({
      files: [
        { name: 'backup.json.gz', size: 1 },
        { name: 'tx-0.snp.gz', size: 2 }
      ],
      info: {
        workspace: 'ws',
        version: '0.7',
        snapshots: [
          {
            date: 1,
            domains: {
              tx: {
                storage: ['tx-0.snp.gz', 'tx-1.snp.gz'],
                snapshots: ['tx.snapshot.gz'],
                added: 0,
                updated: 0,
                removed: 0
              }
            }
          }
        ]
      }
    })

    expect(names).toEqual([
      'index.json',
      'backup.json.gz',
      'blob-info.json.gz',
      'tx-0.snp.gz',
      'tx-1.snp.gz',
      'tx.snapshot.gz'
    ])
  })
})

describe('generateBackupScript', () => {
  const script = generateBackupScript({
    baseUrl: 'https://example.com/backup/ws-1/',
    files: ['index.json', 'tx-0.snp.gz']
  })

  it('embeds the base url without a trailing slash', () => {
    expect(script).toContain("BASE_URL='https://example.com/backup/ws-1'")
  })

  it('never embeds the token; reads it from env or prompts at runtime', () => {
    expect(script).not.toContain("TOKEN='")
    expect(script).toContain('HULY_BACKUP_TOKEN')
    expect(script).toContain('read -rsp')
  })

  it('emits a download line per file', () => {
    expect(script).toContain("download 'index.json'")
    expect(script).toContain("download 'tx-0.snp.gz'")
  })

  it('escapes single quotes in values', () => {
    const evil = generateBackupScript({ baseUrl: "ho'st", files: [] })
    expect(evil).toContain("BASE_URL='ho'\\''st'")
  })

  it('writes the restore readme when provided', () => {
    const withReadme = generateBackupScript({
      baseUrl: 'u',
      files: [],
      restoreReadme: '# Restore me\n'
    })
    expect(withReadme).toContain('RESTORE.md')
    expect(withReadme).toContain('# Restore me')
  })
})

describe('generateRestoreReadme', () => {
  const readme = generateRestoreReadme({ sourceWorkspace: 'ws-uuid-123', fileCount: 7 })

  it('names the source workspace and file count', () => {
    expect(readme).toContain('ws-uuid-123')
    expect(readme).toContain('7')
  })

  it('documents the exact restore command', () => {
    expect(readme).toContain('tool backup-restore')
  })

  it('warns about blobs excluded from the backup', () => {
    expect(readme.toLowerCase()).toContain('video')
    expect(readme.toLowerCase()).toContain('blob')
  })
})

describe('crc32', () => {
  it('matches the standard check value for "123456789"', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })

  it('is zero for empty input', () => {
    expect(crc32(new Uint8Array(0))).toBe(0)
  })
})

describe('buildStoreZip', () => {
  it('produces a valid local-file and EOCD signature', () => {
    const zip = buildStoreZip([{ name: 'a.txt', data: new TextEncoder().encode('hello') }])
    const view = new DataView(zip.buffer)
    expect(view.getUint32(0, true)).toBe(0x04034b50) // local file header
    expect(view.getUint32(zip.length - 22, true)).toBe(0x06054b50) // EOCD
  })

  it('records every entry in the central directory', () => {
    const zip = buildStoreZip([
      { name: 'a.txt', data: new TextEncoder().encode('hello') },
      { name: 'b.txt', data: new TextEncoder().encode('world!') }
    ])
    const view = new DataView(zip.buffer)
    const totalEntries = view.getUint16(zip.length - 22 + 10, true)
    expect(totalEntries).toBe(2)
  })

  it('stores data uncompressed so the payload is embedded verbatim', () => {
    const payload = new TextEncoder().encode('hello')
    const zip = buildStoreZip([{ name: 'a.txt', data: payload }])
    // local header is 30 bytes + 5-byte name => data begins at offset 35
    const stored = zip.slice(35, 40)
    expect(new TextDecoder().decode(stored)).toBe('hello')
  })
})
