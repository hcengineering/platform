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
  import type { Asset, IntlString } from '@hcengineering/platform'
  import { copyTextToClipboard } from '@hcengineering/presentation'
  import { CircleButton, closeTooltip, Label } from '@hcengineering/ui'
  import IconCopy from './icons/Copy.svelte'

  interface Item {
    label: IntlString
    icon: Asset
    value: string
  }

  export let value: Item

  const copyLink = (): void => {
    copyTextToClipboard(value.value)
    closeTooltip()
  }
</script>

<div class="flex-row-center">
  <CircleButton icon={value.icon} size={'x-large'} />
  <div class="flex-col caption-color clear-mins ml-3">
    <div class="text-sm font-medium"><Label label={value.label} /></div>
    <div class="overflow-label">{value.value}</div>
  </div>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="button" on:click|preventDefault={copyLink}>
    <IconCopy size={'small'} />
  </div>
</div>

<style lang="scss">
  .button {
    flex-shrink: 0;
    margin-left: 1.5rem;
    color: var(--dark-color);
    cursor: pointer;
    &:hover {
      color: var(--caption-color);
    }
  }
</style>
