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
  import { Button, ButtonKind, ButtonSize, IconAttachment, tooltip } from '@hcengineering/ui'
  import { DocNavLink } from '@hcengineering/view-resources'
  import AttachmentPopup from './AttachmentPopup.svelte'

  export let value: number | undefined
  export let object: Doc
  export let size: ButtonSize = 'small'
  export let kind: ButtonKind = 'link'
  export let showCounter: boolean = true
  export let compactMode: boolean = false
  export let disabled = false
  export let canAdd = true
  export let canRemove = true
</script>

{#if value && value > 0}
  {@const popupProps = { objectId: object._id, attachments: value, object, canAdd, canRemove }}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <DocNavLink {object} {disabled} inline noUnderline shrink={0}>
    {#if kind === 'list'}
      <Button
        {kind}
        {size}
        showTooltip={{
          component: AttachmentPopup,
          props: popupProps
        }}
      >
        <div slot="icon"><IconAttachment {size} /></div>
        <div slot="content" style:margin-left={showCounter && !compactMode ? '.375rem' : '0'}>
          {#if showCounter && !compactMode}{value ?? 0}{/if}
        </div>
      </Button>
    {:else}
      <div
        use:tooltip={{
          component: AttachmentPopup,
          props: popupProps
        }}
        class="sm-tool-icon"
      >
        <span class="icon"><IconAttachment {size} /></span>
        {#if showCounter}
          {value}
        {/if}
      </div>
    {/if}
  </DocNavLink>
{/if}
