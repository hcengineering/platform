<!--
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
-->
<script lang="ts">
  import { AccountRole, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
  import { getMetadata } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'
  import { Breadcrumb, Button, Expandable, Header, Label, Link, Loading } from '@hcengineering/ui'
  import Scroller from '@hcengineering/ui/src/components/Scroller.svelte'
  import view from '@hcengineering/view'
  import { onMount } from 'svelte'
  import setting from '../plugin'
  import { BackupInfo, BackupSnapshot } from '../types'
  import Expand from '@hcengineering/ui/src/components/icons/Expand.svelte'

  let loading = true

  const backupUrl = getMetadata(setting.metadata.BackupUrl) ?? ''
  const token = getMetadata(presentation.metadata.Token) ?? ''
  const owner = hasAccountRole(getCurrentAccount(), AccountRole.Owner)
  const workspaceId = getMetadata(presentation.metadata.WorkspaceId) ?? ''

  let backupInfo:
  | {
    files: { name: string, size: number }[]
    error?: string
    info?: BackupInfo
  }
  | undefined

  $: fileSizes = new Map(backupInfo?.files?.map((it) => [it.name, it.size ?? 0]))

  function formatDate (timestamp: number): string {
    return new Date(timestamp).toLocaleString()
  }

  function getSize (size: number): string {
    const mbSize = size / (1024 * 1024)

    if (size < 1024) {
      return `${size}b`
    }
    if (size < 1024 * 1024) {
      return `${Math.round(size / 1024)}kb`
    }

    return `${Math.round(mbSize * 100) / 100}Mb`
  }

  function getSnapshotSummary (snapshot: BackupSnapshot): string {
    let size = 0

    Object.values(snapshot.domains).forEach((domain) => {
      domain.storage?.forEach((snapshot) => {
        size += fileSizes.get(snapshot) ?? 0
      })
    })
    return getSize(size)
  }

  function getBackupSize (files: { name: string, size: number }[]): string {
    let size = 0

    files.forEach((file) => {
      size += file.size
    })

    return getSize(size)
  }

  async function updateBackupInfo (): Promise<void> {
    if (owner && backupUrl !== '') {
      try {
        const response = await fetch(`${backupUrl}/${workspaceId}/index.json`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        backupInfo = await response.json()
      } catch (err) {
        console.error('Failed to fetch backup info:', err)
      }
    }
    loading = false
  }

  onMount(() => {
    void updateBackupInfo()
  })

  function formatAgoHours (timestamp: number): string {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffHours < 24) {
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60))
        return `${diffMinutes} minutes ago`
      }
      return `${diffHours} hours ago`
    }

    return ''
  }
  function getFileUrl (filename: string): string {
    return `${backupUrl}/${workspaceId}/${filename}`
  }

  async function downloadFile (filename: string): Promise<void> {
    try {
      const response = await fetch(getFileUrl(filename), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (!response.ok) throw new Error('Download failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Failed to download:', err)
    }
  }
  let copied = false
  let copied2 = false

  $: snapshots = backupInfo?.info?.snapshots ?? []
</script>

<div class="hulyComponent p-2 flex-no-shrink">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={setting.icon.Setting} label={setting.string.Backup} size={'large'} isCurrent />
  </Header>

  <Scroller noStretch>
    {#if loading}
      <Loading size={'small'} />
    {:else if backupInfo == null}
      <div class="no-backups">
        <Label label={setting.string.BackupNoBackup} />
      </div>
    {:else}
      <div class="flex-row flex-gap-4 p-2">
        <span class="flex-row-center">
          <Label label={setting.string.BackupLast} /> : {snapshots.length > 0
            ? formatAgoHours(snapshots[snapshots.length - 1].date)
            : ''}
        </span>
        <span class="flex-row-center">
          <Label label={setting.string.BackupTotalSnapshots} />: {backupInfo?.info?.snapshots?.length}
          <Label label={setting.string.BackupTotalFiles} />: {backupInfo?.files?.length ?? 0}
        </span>
        <span class="flex-row-center">
          <Label label={setting.string.BackupSize} />: {getBackupSize(backupInfo?.files ?? [])}
        </span>
      </div>

      <Expandable bordered>
        <svelte:fragment slot="title">
          <div class="flex-no-shrink flex-row-center p-1">
            <Label label={setting.string.BackupSnapshots} />:
            {snapshots.length}
          </div>
        </svelte:fragment>
        <div class="p-1">
          <div class="file-item">
            <div class="file-name">{'index.json'}</div>
            <div class="file-info">
              <span class="file-size">
                {getSize(JSON.stringify(backupInfo).length)}
              </span>
              <div class="file-actions">
                <Button label={setting.string.BackupFileDownload} on:click={() => downloadFile('index.json')} />
              </div>
            </div>
          </div>
          <div class="file-item">
            <div class="file-name">{'backup.json.gz'}</div>
            <div class="file-info">
              <span class="file-size">
                {getSize(fileSizes.get('backup.json.gz') ?? 0)}
              </span>
              <div class="file-actions">
                <Button label={setting.string.BackupFileDownload} on:click={() => downloadFile('backup.json.gz')} />
              </div>
            </div>
          </div>
        </div>

        {#if backupInfo?.info?.snapshots}
          {@const snLen = backupInfo.info.snapshots.length}
          {#each backupInfo.info.snapshots.reverse() as snapshot, i}
            <div class="flex-no-shrink">
              <Expandable expandable bordered>
                <svelte:fragment slot="title">
                  <div class="flex-row-center ml-1">
                    #{snLen - i}
                    {formatDate(snapshot.date)}
                    {formatAgoHours(snapshot.date)} -
                    {getSnapshotSummary(snapshot)}
                  </div>
                </svelte:fragment>
                <div class="p-2">
                  {#if snapshot.domains}
                    {#each Object.entries(snapshot.domains) as [domain, data]}
                      {#if data.storage?.length}
                        <div class="domain-files">
                          <div class="domain-header">{domain}</div>
                          <div class="files-list">
                            {#each data.storage as filename}
                              <div class="file-item">
                                <div class="file-name">{filename}</div>
                                <div class="file-info">
                                  <span class="file-size">
                                    {getSize(fileSizes.get(filename) ?? 0)}
                                  </span>
                                  <div class="file-actions">
                                    <Button
                                      label={setting.string.BackupFileDownload}
                                      on:click={() => downloadFile(filename)}
                                    />
                                  </div>
                                </div>
                              </div>
                            {/each}
                            {#each data.snapshots ?? [] as filename}
                              <div class="file-item">
                                <div class="file-name">{filename}</div>
                                <div class="file-info">
                                  <span class="file-size">
                                    {getSize(fileSizes.get(filename) ?? 0)}
                                  </span>
                                  <div class="file-actions">
                                    <Button
                                      label={setting.string.BackupFileDownload}
                                      on:click={() => downloadFile(filename)}
                                    />
                                  </div>
                                </div>
                              </div>
                            {/each}
                          </div>
                        </div>
                      {/if}
                    {/each}
                  {/if}
                </div>
              </Expandable>
            </div>
          {/each}
        {:else}
          <div class="no-backups">
            <Label label={setting.string.BackupNoBackup} />
          </div>
        {/if}
        {#if backupInfo?.error}
          <div class="error">{backupInfo.error}</div>
        {/if}
      </Expandable>

      <Expandable expanded={true} bordered>
        <svelte:fragment slot="title">
          <div class="p-1">
            <Label label={setting.string.BackupFiles} />
          </div>
        </svelte:fragment>
        <div class="p-1">
          <div class="file-item">
            <div class="file-name">{'index.json'}</div>
            <div class="file-info">
              <div class="file-actions">
                <Button label={setting.string.BackupFileDownload} on:click={() => downloadFile('index.json')} />
              </div>
            </div>
          </div>
          <div class="file-item">
            <div class="file-name">{'index.html'}</div>
            <div class="file-info">
              <div class="file-actions">
                <Button label={setting.string.BackupFileDownload} on:click={() => downloadFile('index.html')} />
              </div>
            </div>
          </div>
        </div>

        <div class="mt-2">
          <div class="flex-row-center mt-2 flex-between">
            <div class="wrap">
              <Label label={setting.string.BackupLinkInfo} />
              <div class="select-text anti-component p-3 border-b-1 border-divider-color">
                {getFileUrl('index.html')}
              </div>
            </div>
            <Button
              label={copied ? view.string.Copied : view.string.CopyToClipboard}
              on:click={() => {
                void navigator.clipboard.writeText(getFileUrl('index.html')).then(() => {
                  copied = true
                  setTimeout(() => {
                    copied = false
                  }, 2500)
                })
              }}
            />
          </div>
          <div class="mt-2 flex-row-center flex-between">
            <Label label={setting.string.BackupBearerTokenInfo} />

            <Button
              label={copied2 ? view.string.Copied : view.string.CopyToClipboard}
              on:click={() => {
                void navigator.clipboard.writeText(token).then(() => {
                  copied2 = true
                  setTimeout(() => {
                    copied2 = false
                  }, 2500)
                })
              }}
            />
          </div>
        </div>
      </Expandable>
    {/if}
  </Scroller>
</div>

<style lang="scss">
  .error {
    color: var(--theme-error-color);
    padding: 1rem;
    background-color: var(--theme-bg-accent);
    border-radius: 0.25rem;
  }
  .domain-files {
    padding: 0.5rem 0;
  }

  .domain-header {
    font-weight: 500;
    color: var(--theme-content-accent);
  }

  .files-list {
    display: flex;
    flex-direction: column;
    gap: 0.05rem;
  }

  .file-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.05rem;
    background-color: var(--theme-bg-accent);
    border-radius: 0.25rem;

    &:hover {
      background-color: var(--theme-bg-hover);
    }
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .file-size {
    color: var(--theme-content-accent);
    font-size: 0.875rem;
  }

  .file-actions {
    display: flex;
    gap: 0.5rem;
  }

  .file-link,
  .download-btn {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    text-decoration: none;
    color: var(--theme-content-accent);
    background: var(--theme-button-bg);
    border: 1px solid var(--theme-divider-color);
    cursor: pointer;

    &:hover {
      background: var(--theme-button-bg-hover);
    }
  }
</style>
