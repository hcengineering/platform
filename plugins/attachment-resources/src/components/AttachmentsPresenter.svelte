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
  import { Tooltip, IconAttachment } from '@anticrm/ui'
  import AttachmentPopup from './AttachmentPopup.svelte'
  import attachment from '../plugin'

  export let value: Doc & { attachments?: number }

</script>

{#if value && value.attachments && value.attachments > 0}
  <Tooltip label={attachment.string.Attachments} component={AttachmentPopup} props={{ objectId: value._id, attachments: value.attachments }}>
    <div class="sm-tool-icon">
      <span class="icon"><IconAttachment size="small"/></span>&nbsp;{value.attachments}
    </div>
  </Tooltip>
{/if}
