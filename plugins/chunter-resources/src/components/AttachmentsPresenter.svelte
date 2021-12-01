<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import type { Doc } from '@anticrm/core'
  import type { Attachment } from '@anticrm/chunter'
  import { IconFile, Link, Tooltip, IconAttachment } from '@anticrm/ui'
  import { PDFViewer } from '@anticrm/presentation'
  import AttachmentPopup from './AttachmentPopup.svelte'

  export let value: Doc & { attachments?: number }

</script>

<!-- {#if Object.keys(value.attachments).length === 1}
  <Link label={Object.values(value.attachments)[0].name} href={'#'} icon={IconFile} on:click={ () => { showPopup(PDFViewer, { file: Object.values(value.attachments)[0].file }, 'right') } }/>
{:else if Object.keys(value.attachments).length > 1}
  <Tooltip label={'Attachments (' + Object.values(value.attachments).length + ')'} component={AttachmentPopup} props={{ files: value.attachments }}>
    <Link label={Object.values(value.attachments).length + ' files'} href={'#'} icon={IconFile} />
  </Tooltip>
{/if} -->

{#if value.attachments && value.attachments > 0}
  <Tooltip label={'Attachments (' + value.attachments + ')'} component={AttachmentPopup} props={{ objectId: value._id }}>
    <div class="sm-tool-icon">
      <span class="icon"><IconAttachment size="small"/></span>&nbsp;{value.attachments}
    </div>
  </Tooltip>
{/if}
