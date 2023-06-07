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
  import { Button, ButtonKind, ButtonSize, IconThread, tooltip } from '@hcengineering/ui'
  import { DocNavLink } from '@hcengineering/view-resources'
  import CommentPopup from './CommentPopup.svelte'

  export let value: number | undefined
  export let object: Doc
  export let size: ButtonSize = 'small'
  export let kind: ButtonKind = 'link'
  export let showCounter = true
  export let withInput: boolean = true
</script>

{#if value && value > 0}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <DocNavLink {object} inline noUnderline={true}>
    {#if kind === 'list'}
      <div
        use:tooltip={{
          component: CommentPopup,
          props: { objectId: object._id, object, withInput }
        }}
        class="sm-tool-icon"
      >
        <Button {kind} {size}>
          <div slot="content" class="flex-row-center">
            <span class="icon"><IconThread size={'small'} /></span>
            {#if showCounter}
              {value ?? 0}
            {/if}
          </div>
        </Button>
      </div>
    {:else}
      <div
        use:tooltip={{
          component: CommentPopup,
          props: { objectId: object._id, object, withInput }
        }}
        class="sm-tool-icon"
      >
        <span class="icon"><IconThread {size} /></span>
        {#if showCounter && value && value !== 0}
          {value}
        {/if}
      </div>
    {/if}
  </DocNavLink>
{/if}
