import client, { clientId } from '@hcengineering/client'
import { getWorkspaceId, MeasureMetricsContext, type BackupClient, type Client } from '@hcengineering/core'
import { addLocation, getResource, setMetadata } from '@hcengineering/platform'
import WebSocket from 'ws'

import {
  backup,
  createFileBackupStorage
} from '@hcengineering/server-backup'
import { dialog, type BrowserWindow } from 'electron'

let runningBackup: {
  notify: (command: string, ...args: any[]) => void
} | undefined

export async function createClient (
  transactorUrl: string,
  token: string
): Promise<Client & BackupClient> {
  // We need to override default factory with 'ws' one.
  // eslint-disable-next-line
  setMetadata(client.metadata.UseBinaryProtocol, true)
  setMetadata(client.metadata.UseProtocolCompression, true)
  setMetadata(client.metadata.ConnectionTimeout, 0)
  setMetadata(client.metadata.ClientSocketFactory, (url) => {
    return new WebSocket(url) as any
  })
  addLocation(clientId, () => import('@hcengineering/client-resources'))

  const clientFactory = await getResource(client.function.GetClient)
  return (await clientFactory(token, transactorUrl)) as unknown as Client & BackupClient
}

async function doBackup (dirName: string, token: string, endpoint: string, workspace: string, notify: (command: string, ...args: any[]) => void, backupHugeFiles: boolean): Promise<void> {
  notify('backup', 0)
  const ctx = new MeasureMetricsContext('backup', {})

  const storage = await createFileBackupStorage(dirName)
  const wsid = getWorkspaceId(workspace)
  const client = await createClient(endpoint, token)
  try {
    ctx.info('do backup', { workspace, endpoint })
    await backup(ctx, endpoint, wsid, storage, {
      force: true,
      recheck: false,
      skipDomains: [],
      timeout: 0,
      connectTimeout: 60 * 1000,
      blobDownloadLimit: backupHugeFiles ? 10240 : 50,
      token,
      skipBlobContentTypes: [],
      isCanceled: (): boolean => {
        return runningBackup == null
      },
      progress: (value: number): void => {
        notify('backup', value)
      },
      connection: client
    })
  } finally {
    await client.close()
  }

  notify('backup', 100)
}

export function startBackup (window: BrowserWindow, token: string, endpoint: string, workspace: string, cmd: (command: string, ...args: any[]) => void): void {
  void dialog
    .showOpenDialog(window, {
      properties: ['openDirectory'],
      buttonLabel: 'Select a backup folder',
      message: 'Select a folder for Huly incremental backup.'
    })
    .then((response) => {
      if (!response.canceled && response.filePaths.length > 0) {
        void dialog
          .showMessageBox({
            type: 'info',
            buttons: ['Backup....', 'Cancel'],
            defaultId: 0,
            textWidth: 500,
            title: 'Huly desktop need a confirmation for a backup process to be started...',
            message: `Huly Desktop need a confirmation for a backup process to be started....\n\n
                      An incremental backup will be performed to folder:\n ${response.filePaths[0]}\n
                      Backup could be canceled and resumed laterly into same location.`,
            checkboxLabel: 'Include files >= 50mb',
            checkboxChecked: false
          })
          .then((backupKind) => {
            if (backupKind.response === 1) {
              return
            }
            runningBackup = {
              notify: cmd
            }
            void doBackup(response.filePaths[0], token, endpoint, workspace, cmd, backupKind.checkboxChecked)
          })
      }
    })
}
export function cancelBackup (): void {
  if (runningBackup != null) {
    runningBackup.notify('backup-cancel')
  }
  runningBackup = undefined
}
