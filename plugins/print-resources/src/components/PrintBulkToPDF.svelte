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
  import { createEventDispatcher, onMount } from 'svelte'
  import type { Blob, Doc, Ref } from '@hcengineering/core'
  import presentation, { Card, getClient, PDFViewer } from '@hcengineering/presentation'
  import view from '@hcengineering/view'
  import { Button, Label, Loading, Scroller } from '@hcengineering/ui'

  import print from '../plugin'
  import { type PdfResult, printAll, downloadPdf, downloadAllPdfs } from '../printUtils'

  export let objects: Doc[] = []
  export let signed: boolean = false

  const client = getClient()

  let results: PdfResult[] = []
  let currentIndex = 0
  let cancelled = false
  let processing = true
  let downloadAllLoading = false
  let selectedResult: PdfResult | undefined = undefined

  $: viewerFile = (selectedResult !== undefined ? selectedResult.blobId : undefined) as Ref<Blob> | undefined

  $: total = objects.length
  $: successCount = results.filter((r) => r.error === undefined).length
  $: failedList = results.filter((r) => r.error !== undefined)

  function cancel (): void {
    cancelled = true
    close()
  }

  function openPdf (result: PdfResult): void {
    if (result.error !== undefined) return
    selectedResult = result
  }

  async function doDownloadAll (): Promise<void> {
    downloadAllLoading = true
    try {
      await downloadAllPdfs(results)
    } finally {
      downloadAllLoading = false
    }
  }

  const dispatch = createEventDispatcher()

  function close (): void {
    dispatch('close')
  }

  onMount(() => {
    if (objects.length > 0) {
      results = []
      currentIndex = 0
      cancelled = false
      processing = true
      void printAll(client, objects, signed, {
        onProgress: (current) => {
          currentIndex = current
        },
        getCancelled: () => cancelled
      }).then((r) => {
        results = r
        processing = false
      })
    }
  })
</script>

<svelte:window
  on:keydown={(e) => {
    if (e.key === 'Escape') {
      if (selectedResult !== undefined) {
        selectedResult = undefined
      } else {
        close()
      }
    }
  }}
/>

{#if selectedResult === undefined}
  <div class="flex p-4">
    <Card
      label={print.string.PrintToPDF}
      okAction={() => {}}
      canSave={false}
      hideFooter={true}
      width="medium"
      on:close={close}
    >
      <div class="flex flex-col gap-2">
        {#if processing && currentIndex <= total}
          <div class="flex flex-col gap-2 py-2">
            <div class="flex items-start gap-2">
              <Label label={print.string.PrintingDocumentOf} params={{ current: currentIndex, total }} />
              <div class="flex pl-2">
                <Loading shrink={true} size="small" />
              </div>
            </div>
            <div class="flex justify-end">
              <Button kind="secondary" label={presentation.string.Cancel} on:click={cancel} />
            </div>
          </div>
        {:else}
          <div class="results-scroller">
            <Scroller>
              <div class="flex flex-col gap-1 w-full">
                {#each results as result}
                  <div class="flex items-center justify-between gap-2 py-1 w-full">
                    <span class="truncate flex-1 min-w-0 secondary-textColor" title={result.title ?? ''}>
                      {#if result.error !== undefined}
                        {result.title} – <Label label={print.string.PrintFailed} />
                      {:else}
                        {result.title}
                      {/if}
                    </span>
                    <div class="flex gap-1 shrink-0 w-[11rem] justify-end">
                      {#if result.error === undefined}
                        <Button
                          kind="ghost"
                          size="small"
                          label={presentation.string.Download}
                          on:click={() => {
                            downloadPdf(result)
                          }}
                        />
                        <Button
                          kind="ghost"
                          size="small"
                          label={view.string.Open}
                          on:click={() => {
                            openPdf(result)
                          }}
                        />
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </Scroller>
          </div>
          {#if successCount > 0}
            <div class="flex justify-end pt-2">
              <Button
                kind="primary"
                label={print.string.DownloadAll}
                disabled={downloadAllLoading}
                on:click={doDownloadAll}
              />
            </div>
          {/if}
          {#if failedList.length > 0}
            <p class="secondary-textColor text-sm">
              {successCount} succeeded, {failedList.length} failed.
            </p>
          {/if}
        {/if}
      </div>
    </Card>
  </div>
{:else}
  <PDFViewer
    file={viewerFile}
    name={selectedResult.title}
    contentType="application/pdf"
    showIcon={false}
    isLoading={false}
    on:close={() => {
      selectedResult = undefined
    }}
    on:fullsize
  />
{/if}

<style lang="scss">
  .results-scroller {
    max-height: 16rem;
    min-height: 0;
    flex: 1;
    overflow: hidden;
  }
</style>
