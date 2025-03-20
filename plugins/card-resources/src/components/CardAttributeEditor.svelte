<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { Card } from '@hcengineering/card'
  import { Doc, Mixin } from '@hcengineering/core'
  import { Button, Grid, IconDownOutline, IconUpOutline, resizeObserver } from '@hcengineering/ui'
  import card from '../plugin'
  import MasterTagAttributes from './MasterTagAttributes.svelte'
  import TagAttributes from './TagAttributes.svelte'

  export let value: Card
  export let readonly: boolean = false
  export let mixins: Array<Mixin<Doc>> = []
  export let ignoreKeys: string[]

  let width: number = 0

  let columns = 1
  $: columns = width > 600 ? 2 : 1

  const tagAttributes: TagAttributes[] = []
  $: tagAttributes.length = mixins.length

  let masterTagAttributes: MasterTagAttributes

  function collapseAll (): void {
    masterTagAttributes.collapse()
    tagAttributes.forEach((tag) => tag.collapse())
  }

  function expandAll (): void {
    masterTagAttributes.expand()
    tagAttributes.forEach((tag) => tag.expand())
  }
</script>

<div use:resizeObserver={(element) => (width = element.clientWidth)}>
  {#if mixins.length > 0}
    <div class="flex btn flex-gap-2">
      <Button label={card.string.MinimizeAll} kind={'ghost'} iconRight={IconUpOutline} on:click={collapseAll} />
      <Button label={card.string.ExpandAll} kind={'ghost'} iconRight={IconDownOutline} on:click={expandAll} />
    </div>
  {/if}
  <div class="divider" />
  <div class="masterTag">
    <MasterTagAttributes bind:this={masterTagAttributes} {readonly} {value} {ignoreKeys} fourRows={columns === 2} />
  </div>
  {#if mixins.length > 0}
    <div class="divider" />
    <Grid column={columns} columnGap={0} rowGap={0} alignItems={'start'}>
      {#each mixins as tag, i (tag._id)}
        <div class="tag" class:withoutBorder={Math.ceil((i + 1) / columns) === Math.ceil(mixins.length / columns)}>
          <TagAttributes bind:this={tagAttributes[i]} {readonly} {tag} {value} {ignoreKeys} />
        </div>
      {/each}
    </Grid>
  {/if}
  <div class="divider" />
</div>

<style lang="scss">
  .btn {
    margin-top: 1rem;
  }

  .tag {
    border-bottom: 1px solid var(--theme-divider-color);
    height: 100%;
    padding: 1rem;
    padding-left: 0;

    &.withoutBorder {
      padding-bottom: 0;
      border-bottom: none;
    }
  }

  .divider {
    margin-top: 1.5rem;
    border-bottom: 1px solid var(--theme-divider-color);
  }
</style>
