<!--
// Copyright © 2024 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
//
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
  import { Analytics } from '@hcengineering/analytics'
  import { Doc, type Blob, type Ref } from '@hcengineering/core'
  import presentation, { PDFViewer, getClient } from '@hcengineering/presentation'
  import {
    Button,
    DropdownIntlItem,
    eventToHTMLElement,
    IconCheck,
    Label,
    IconMoreH,
    ModernPopup,
    showPopup
  } from '@hcengineering/ui'
  import { getDocTitle } from '@hcengineering/view-resources'
  import { printToPDF, type PrintPageOrientation } from '@hcengineering/print'
  import { signPDF } from '@hcengineering/sign'
  import { getMetadata } from '@hcengineering/platform'

  import print from '../plugin'

  export let object: Doc
  export let signed: boolean = false

  const client = getClient()

  let isLoading = true
  let failed = false
  let file: Ref<Blob> | undefined = undefined
  let title = ''
  let orientation: PrintPageOrientation = 'portrait'
  let printRequest = 0

  $: printSettingsItems = [
    {
      id: 'landscape',
      label: print.string.LandscapeMode,
      icon: orientation === 'landscape' ? IconCheck : undefined
    }
  ] satisfies DropdownIntlItem[]

  function nextPrintRequest (): number {
    printRequest += 1
    return printRequest
  }

  $: if (object !== undefined) void prepare(object, orientation, signed)

  async function prepare (doc: Doc, orientation: PrintPageOrientation, signed: boolean): Promise<void> {
    const request = nextPrintRequest()
    file = undefined
    isLoading = true
    failed = false
    const token = getMetadata(presentation.metadata.Token) ?? ''
    try {
      let result = await printToPDF(doc, token, { orientation })
      if (request !== printRequest) return
      if (signed) result = await signPDF(result, token)
      if (request === printRequest) file = result as Ref<Blob>
    } catch (error) {
      if (request === printRequest) {
        failed = true
        Analytics.handleError(error instanceof Error ? error : new Error(String(error)))
      }
    } finally {
      if (request === printRequest) isLoading = false
    }
  }

  async function updateDocTitle (obj: Doc): Promise<void> {
    const value = (await getDocTitle(client, obj._id, obj._class, obj)) ?? ''
    title = value !== '' ? value + '.pdf' : ''
  }

  function toggleOrientation (): void {
    nextPrintRequest()
    orientation = orientation === 'landscape' ? 'portrait' : 'landscape'
    file = undefined
    isLoading = true
  }

  function handlePrintSetting (id: 'landscape' | 'contentOnly'): void {
    if (id === 'landscape') {
      toggleOrientation()
    }
  }

  function openPrintSettings (event: MouseEvent): void {
    showPopup(
      ModernPopup,
      { items: printSettingsItems },
      eventToHTMLElement(event),
      (result: 'landscape' | 'contentOnly' | undefined) => {
        if (result !== undefined) {
          handlePrintSetting(result)
        }
      }
    )
  }

  $: void updateDocTitle(object)
</script>

<PDFViewer {file} name={title} contentType="application/pdf" showIcon={false} {isLoading} on:close on:fullsize>
  <svelte:fragment slot="utils">
    {#if failed}<Label label={print.string.PrintFailed} />{/if}
    <Button
      icon={IconMoreH}
      kind="ghost"
      disabled={isLoading}
      showTooltip={{ label: print.string.PrintSettings, direction: 'bottom' }}
      on:click={openPrintSettings}
    />
  </svelte:fragment>
</PDFViewer>
