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
  import { Button, ButtonSize, TimeSince } from '@hcengineering/ui'

  export let value: number
  export let kind: 'no-border' | 'link' | 'list' = 'no-border'
  export let readonly = false
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'fit-content'
</script>

{#if kind === 'link'}
  <Button {kind} {size} {justify} {width}>
    <svelte:fragment slot="content">
      <TimeSince {value} />
    </svelte:fragment>
  </Button>
{:else}
  <TimeSince {value} {kind} />
{/if}
