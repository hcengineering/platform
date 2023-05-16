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
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { LabelAndProps, LinkWrapper, tooltip } from '@hcengineering/ui'

  export let value: string | string[] | undefined
  export let oneLine: boolean = false

  $: tooltipParams = getTooltip(value)

  function getTooltip (value: string | string[] | undefined): LabelAndProps | undefined {
    if (value === undefined) return
    let str = ''
    if (Array.isArray(value)) {
      str = value.reduce((acc, curr, i) => (acc += i === 0 ? curr : ` ${curr}`), '')
    } else {
      str = value
    }
    return {
      label: getEmbeddedLabel(str)
    }
  }
</script>

<span class="{oneLine ? 'overflow-label' : 'lines-limit-2'} select-text" use:tooltip={tooltipParams}>
  {#if Array.isArray(value)}
    {#each value as str, i}
      <span class:ml-1={i !== 0}><LinkWrapper text={str} /></span>
    {/each}
  {:else if value}
    <LinkWrapper text={value} />
  {/if}
</span>
