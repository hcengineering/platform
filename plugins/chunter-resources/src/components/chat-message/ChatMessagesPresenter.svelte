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
  import { Button, ButtonKind, ButtonSize, IconThread } from '@hcengineering/ui'

  import ChatMessagePopup from './ChatMessagePopup.svelte'
  import { restrictionStore } from '@hcengineering/view-resources'

  export let value: number | undefined
  export let object: Doc
  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'small'
  export let showCounter: boolean = true
  export let compactMode: boolean = false
  export let withInput: boolean = true

  $: disabled = $restrictionStore.disableComments
</script>

{#if value && value > 0}
  <Button
    {kind}
    {size}
    showTooltip={{
      component: ChatMessagePopup,
      props: { objectId: object._id, object, withInput: withInput && !disabled }
    }}
  >
    <div slot="icon">
      <IconThread {size} />
    </div>
    <div slot="content" style:margin-left={showCounter && !compactMode ? '.375rem' : '0'}>
      {#if showCounter && !compactMode}{value}{/if}
    </div>
  </Button>
{/if}
