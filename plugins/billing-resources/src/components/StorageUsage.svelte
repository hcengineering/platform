<!--
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
-->
<script lang="ts">
  import { Tier } from '@hcengineering/billing'
  import { SortingOrder, type UsageStatus, getCurrentAccount } from '@hcengineering/core'
  import { translate } from '@hcengineering/platform'
  import { getClient, getCurrentWorkspaceUuid, MessageBox } from '@hcengineering/presentation'
  import {
    Button,
    Label,
    Loading,
    NotificationSeverity,
    Scroller,
    addNotification,
    humanReadableFileSize,
    showPopup,
    themeStore
  } from '@hcengineering/ui'
  import filesize from 'filesize'
  import { onMount } from 'svelte'

  import plugin from '../plugin'
  import {
    calculateLimits,
    canManageStorage,
    deleteFilesBatch,
    getAccountClient,
    getBillingClient,
    getCurrentSubscription
  } from '../utils'
  import { fetchLargestFiles, type LargestFileRow } from '../stores/largestFiles'
  import BillingErrorNotification from './BillingErrorNotification.svelte'
  import LargestFilesTable from './LargestFilesTable.svelte'
  import StatsCard from './StatsCard.svelte'
  import UsageProgress from './UsageProgress.svelte'

  const PAGE_SIZE = 50

  const client = getClient()
  const tiers = client.getModel().findAllSync(plugin.class.Tier, {}, { sort: { index: SortingOrder.Ascending } })

  let usage: UsageStatus | null = null
  let tier: Tier | undefined
  let totalDatalakeBytes: number | undefined
  let totalDatalakeCount: number | undefined

  let rows: LargestFileRow[] = []
  let limit = PAGE_SIZE
  let lastFetchedCount = 0
  let loadingFiles = true
  let loadingMore = false
  let listError = false
  let hasMore = false

  let selected = new Set<string>()
  let isDeleting = false

  $: limits = calculateLimits(tier)
  $: storageUsedBytes = usage?.usage?.storageBytes ?? 0
  $: overLimit = limits.storageLimit > 0 && storageUsedBytes > limits.storageLimit

  $: canManage = canManageStorage(getCurrentAccount())

  async function showErrorNotification (
    titleKey = plugin.string.SubscriptionOperationFailed,
    messageKey = plugin.string.SubscriptionErrorMessage
  ): Promise<void> {
    addNotification(
      await translate(titleKey, {}, $themeStore.language),
      await translate(messageKey, {}, $themeStore.language),
      BillingErrorNotification,
      undefined,
      NotificationSeverity.Error
    )
  }

  async function loadUsage (): Promise<void> {
    try {
      const accountClient = getAccountClient()
      if (accountClient == null) return

      const [workspaceInfo, subscription] = await Promise.all([
        accountClient.getWorkspaceInfo(false),
        getCurrentSubscription(accountClient).catch(() => undefined)
      ])
      usage = workspaceInfo?.usageInfo ?? null

      if (subscription !== undefined) {
        const plan = subscription.plan
        tier = tiers.find((t) => t._id.endsWith(`:${plan.toLowerCase()}`))
      }

      const billingClient = getBillingClient()
      const workspace = getCurrentWorkspaceUuid()
      if (billingClient != null && workspace != null) {
        try {
          const stats = await billingClient.getDatalakeStats(workspace)
          totalDatalakeBytes = stats.size
          totalDatalakeCount = stats.count
        } catch (err) {
          // Non-fatal — the progress bar still works without datalake stats.
          console.warn('Failed to load datalake stats', err)
        }
      }
    } catch (err) {
      console.error('Failed to load storage usage', err)
      await showErrorNotification()
    }
  }

  async function loadFiles (currentLimit: number, isReload: boolean): Promise<void> {
    if (!canManage) {
      loadingFiles = false
      return
    }
    if (isReload) {
      loadingFiles = true
      listError = false
    } else {
      loadingMore = true
    }

    try {
      const next = await fetchLargestFiles(client, currentLimit)
      rows = next
      lastFetchedCount = next.length
      hasMore = next.length >= currentLimit
    } catch (err) {
      console.error('Failed to load largest files', err)
      listError = true
      await showErrorNotification()
    } finally {
      loadingFiles = false
      loadingMore = false
    }
  }

  async function handleLoadMore (): Promise<void> {
    if (loadingMore || loadingFiles) return
    if (lastFetchedCount < limit) {
      hasMore = false
      return
    }
    limit += PAGE_SIZE
    await loadFiles(limit, false)
  }

  function handleSelect (event: CustomEvent<{ id: string, checked: boolean }>): void {
    const { id, checked } = event.detail
    const next = new Set(selected)
    if (checked) next.add(id)
    else next.delete(id)
    selected = next
  }

  function handleSelectAll (event: CustomEvent<{ checked: boolean }>): void {
    const next = new Set<string>()
    if (event.detail.checked) {
      for (const row of rows) next.add(row.id as unknown as string)
    }
    selected = next
  }

  function handleClear (): void {
    selected = new Set()
  }

  async function handleDeleteSelected (): Promise<void> {
    const targets = rows.filter((r) => selected.has(r.id as unknown as string))
    if (targets.length === 0) return

    const totalSize = targets.reduce((sum, r) => sum + r.size, 0)

    showPopup(MessageBox, {
      label: plugin.string.ConfirmDeleteFiles,
      labelProps: { count: targets.length },
      message: plugin.string.DeleteFilesDescription,
      params: { size: humanReadableFileSize(totalSize, 10, 1) },
      dangerous: true,
      action: async () => {
        await runDelete(targets, totalSize)
      }
    })
  }

  async function runDelete (targets: LargestFileRow[], totalSize: number): Promise<void> {
    isDeleting = true
    try {
      const results = await deleteFilesBatch(targets)
      const succeeded = results.filter((r) => r.success)
      const failed = results.filter((r) => !r.success)

      const freedBytes = succeeded.reduce((sum, r) => sum + r.row.size, 0)

      if (succeeded.length > 0) {
        const succeededIds = new Set(succeeded.map((r) => r.row.id as unknown as string))
        rows = rows.filter((r) => !succeededIds.has(r.id as unknown as string))
        const nextSelected = new Set<string>()
        for (const f of failed) {
          nextSelected.add(f.row.id as unknown as string)
        }
        selected = nextSelected
        addNotification(
          await translate(
            plugin.string.FilesDeleted,
            { count: succeeded.length, freed: humanReadableFileSize(freedBytes, 10, 1) },
            $themeStore.language
          ),
          '',
          BillingErrorNotification,
          undefined,
          NotificationSeverity.Success
        )
      }

      if (failed.length > 0) {
        await showErrorNotification(plugin.string.FilesDeleteFailed)
      }

      // Refresh usage totals to reflect the freed bytes.
      await loadUsage()
      // Don't reuse stale totalSize — keep parameter to make signature stable.
      void totalSize
    } catch (err) {
      console.error('Failed to delete files', err)
      await showErrorNotification(plugin.string.FilesDeleteFailed)
    } finally {
      isDeleting = false
    }
  }

  async function handleRefresh (): Promise<void> {
    selected = new Set()
    limit = PAGE_SIZE
    await Promise.all([loadUsage(), loadFiles(limit, true)])
  }

  onMount(() => {
    void (async () => {
      await Promise.all([loadUsage(), loadFiles(limit, true)])
    })()
  })
</script>

<Scroller align={'center'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
  <div class="hulyComponent-content gapV-4 storage-usage">
    {#if !canManage}
      <div class="access-denied text-md">
        <Label label={plugin.string.StorageAccessDenied} />
      </div>
    {:else}
      <div class="section-header">
        <div class="section-title">
          <Label label={plugin.string.Usage} />
        </div>
        <Button label={plugin.string.Refresh} kind="ghost" on:click={handleRefresh} />
      </div>

      <div class="usage-card flex-col flex-gap-3">
        <UsageProgress label={plugin.string.StorageUsage} value={storageUsedBytes} limit={limits.storageLimit} />

        {#if overLimit}
          <div class="over-limit text-md">
            <Label label={plugin.string.StorageOverLimit} />
          </div>
        {/if}

        <div class="text-sm dim">
          <Label label={plugin.string.StorageUsageIncludesSystem} />
        </div>

        <div class="stats-row">
          <StatsCard
            label={plugin.string.DriveSize}
            text={totalDatalakeBytes !== undefined ? filesize(totalDatalakeBytes, { spacer: ' ' }) : '—'}
          />
          <StatsCard
            label={plugin.string.DriveCount}
            text={totalDatalakeCount !== undefined ? totalDatalakeCount.toLocaleString() : '—'}
          />
        </div>
      </div>

      <div class="section-header">
        <div class="section-title">
          <Label label={plugin.string.LargestFiles} />
        </div>
      </div>
      <div class="text-sm dim">
        <Label label={plugin.string.LargestFilesDescription} />
      </div>

      {#if listError && rows.length === 0}
        <div class="state empty text-md">
          <Label label={plugin.string.SubscriptionErrorMessage} />
        </div>
      {:else if isDeleting && loadingFiles}
        <Loading />
      {:else}
        <LargestFilesTable
          {rows}
          loading={loadingFiles}
          {loadingMore}
          {hasMore}
          {selected}
          on:select={handleSelect}
          on:selectAll={handleSelectAll}
          on:clearSelection={handleClear}
          on:deleteSelected={handleDeleteSelected}
          on:loadMore={handleLoadMore}
        />
      {/if}
    {/if}
  </div>
</Scroller>

<style lang="scss">
  .storage-usage {
    max-width: 60rem;
    width: 100%;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .section-title {
    font-weight: 500;
    font-size: 1rem;
  }

  .usage-card {
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--medium-BorderRadius);
    padding: var(--spacing-2);
  }

  .stats-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2);
  }

  .over-limit {
    padding: var(--spacing-1_5) var(--spacing-2);
    border: 1px solid var(--theme-state-negative-color);
    border-radius: var(--medium-BorderRadius);
    background-color: var(--theme-state-negative-background-color);
    color: var(--theme-state-negative-color);
  }

  .access-denied {
    padding: var(--spacing-2);
    color: var(--theme-content-color);
  }

  .dim {
    color: var(--theme-dark-color);
  }

  .state.empty {
    padding: var(--spacing-4);
    text-align: center;
    color: var(--theme-dark-color);
  }
</style>
