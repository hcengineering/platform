<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { AttachmentsDocumentSection, DocumentSection } from '@hcengineering/controlled-documents'
  import { Attachments } from '@hcengineering/attachment-resources'
  import { Scroller } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'

  export let value: DocumentSection
  export let readonly = false
  export let showHeader = true
  export let withScroll = true
  const dispatch = createEventDispatcher()

  onMount(() => {
    dispatch('open', {})
  })

  $: attachmentSection = value as AttachmentsDocumentSection
  $: attachmentsProps = {
    objectId: value._id,
    space: value.space,
    _class: value._class,
    attachments: attachmentSection.attachments ?? 0,
    readonly,
    showHeader
  }
</script>

{#if withScroll}
  <Scroller autoscroll>
    <div class="mr-6">
      <Attachments {...attachmentsProps} />
    </div>
  </Scroller>
{:else}
  <Attachments {...attachmentsProps} />
{/if}
