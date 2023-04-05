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
  import type { Doc } from '@hcengineering/core'
  import { IconAttachment, tooltip } from '@hcengineering/ui'
  import { DocNavLink } from '@hcengineering/view-resources'
  import attachment from '../plugin'
  import AttachmentPopup from './AttachmentPopup.svelte'

  export let value: number | undefined
  export let object: Doc
  export let size: 'small' | 'medium' | 'large' = 'small'
  export let showCounter = true
</script>

{#if value && value > 0}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <DocNavLink {object} inline noUnderline={true}>
    <div
      use:tooltip={{
        label: attachment.string.Attachments,
        component: AttachmentPopup,
        props: { objectId: object._id, attachments: value }
      }}
      class="sm-tool-icon ml-1 mr-1"
    >
      <span class="icon"><IconAttachment {size} /></span>
      {#if showCounter}
        &nbsp;{value}
      {/if}
    </div>
  </DocNavLink>
{/if}
