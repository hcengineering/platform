//
// Copyright © 2026 TraceX SAS.
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

import { MeasureMetricsContext, type WorkspaceIds, type WorkspaceUuid } from '@hcengineering/core'
import { type StorageAdapter } from '@hcengineering/server-core'
import { createStorageBackupStorage, InvalidBackupFileNameError } from '../storage'

const wsIds: WorkspaceIds = { uuid: 'backups' as WorkspaceUuid, url: 'backups' }

describe('backup storage prefix', () => {
  const ctx = new MeasureMetricsContext('test', {})

  const read = jest
    .fn<ReturnType<StorageAdapter['read']>, Parameters<StorageAdapter['read']>>()
    .mockResolvedValue([Buffer.from('own backup')])
  const client = { read } as unknown as StorageAdapter

  beforeEach(() => {
    read.mockClear()
  })

  it.each(['workspace', 'workspace/', 'workspace//', 'parent/workspace/'])(
    'reads its own files with root %j',
    async (root) => {
      const storage = await createStorageBackupStorage(ctx, client, wsIds, root, false)
      await expect(storage.loadFile('backup.json.gz')).resolves.toEqual(Buffer.from('own backup'))
      const expectedRoot = root.startsWith('parent/') ? 'parent/workspace' : 'workspace'
      expect(read).toHaveBeenCalledWith(ctx, wsIds, `${expectedRoot}/backup.json.gz`)
    }
  )

  it.each(['workspace', 'workspace/'])('keeps nested snapshot files under root %j', async (root) => {
    const storage = await createStorageBackupStorage(ctx, client, wsIds, root, false)
    await storage.loadFile('000001/tracker.snapshot.gz')
    expect(read).toHaveBeenCalledWith(ctx, wsIds, 'workspace/000001/tracker.snapshot.gz')
  })

  it.each(['workspace', 'workspace/'])(
    'rejects other workspace keys for root %j before calling the adapter',
    async (root) => {
      const storage = await createStorageBackupStorage(ctx, client, wsIds, root, false)
      for (const file of [
        '../victim/backup.json.gz',
        '../workspace-sibling/backup.json.gz',
        '/victim/backup.json.gz'
      ]) {
        const operations = [
          storage.loadFile(file),
          storage.load(file),
          storage.write(file),
          storage.writeFile(file, 'data'),
          storage.exists(file),
          storage.stat(file),
          storage.statInfo(file),
          storage.delete(file)
        ]
        await Promise.all(
          operations.map(async (operation) => {
            await expect(operation).rejects.toBeInstanceOf(InvalidBackupFileNameError)
          })
        )
      }
      expect(read).not.toHaveBeenCalled()
    }
  )
})
