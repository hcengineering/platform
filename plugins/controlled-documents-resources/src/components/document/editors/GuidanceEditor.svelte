<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { createEventDispatcher } from 'svelte'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { DocumentSection } from '@hcengineering/controlled-documents'
  import { ModernDialog, IconClose } from '@hcengineering/ui'
  import { StyledTextArea } from '@hcengineering/text-editor'
  import { MessageViewer, getClient } from '@hcengineering/presentation'

  import documentsRes from '../../../plugin'
  import GuidanceEditing from '../../icons/GuidanceEditing.svelte'
  import { type GuidanceEditorMode } from '../../../utils'

  export let section: DocumentSection
  export let index: number
  export let width: string | undefined = undefined
  export let mode: GuidanceEditorMode = 'readonly'

  const dispatch = createEventDispatcher()

  function handleCloseClick (): void {
    const reopenMode: GuidanceEditorMode | undefined = mode === 'canEdit' ? 'editing' : undefined
    close(reopenMode)
  }

  function close (reopenMode?: GuidanceEditorMode): void {
    dispatch('close', { reopenMode, guidance: reopenMode == null ? guidance : undefined })
  }

  export function onOutsideClick (): void {
    close()
  }

  const client = getClient()
  const h = client.getHierarchy()

  const title = `${index}. ${section.title}`
  let guidance = h.as(section, documentsRes.mixin.DocumentTemplateSection).guidance

  let textArea: StyledTextArea
</script>

<ModernDialog
  label={getEmbeddedLabel(title)}
  closeIcon={mode !== 'canEdit' ? IconClose : GuidanceEditing}
  withoutFooter
  on:close={handleCloseClick}
  {width}
  shadow={mode !== 'editing'}
>
  {#if mode === 'editing'}
    <StyledTextArea bind:this={textArea} isScrollable={false} bind:content={guidance} showButtons={false} />
  {:else}
    <!-- TODO: use StyledTextArea.setEditable when it's fixed -->
    <MessageViewer message={guidance ?? ''} />
  {/if}
</ModernDialog>
