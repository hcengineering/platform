<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { getContext } from 'svelte'
  import type { TSelectDate } from '../types'

  export let value: TSelectDate
  export let bigDay: boolean = false
  export let wraped: boolean = false
  export let withTime: boolean = false

  const { currentLanguage } = getContext('lang')
  let inter: boolean = (currentLanguage === 'ru') ?? false

  const zeroLead = (n: number): string => {
    if (n < 10) return '0' + n.toString()
    return n.toString()
  }
</script>

{#if value !== undefined}
  <div class="antiWrapper" class:wraped>
    <span class="result" class:selected={value !== null} class:not-selected={value === null} class:highlight={inter && bigDay}>
      {#if value === null}--{:else}{inter ? value.getDate() : value.getMonth() + 1}{/if}
    </span>
    <span class="divider" class:inter>{inter ? '.' : '/'}</span>
    <span class="result" class:selected={value !== null} class:not-selected={value === null} class:highlight={!inter && bigDay}>
      {#if value === null}--{:else}{inter ? value.getMonth() + 1 : value.getDate()}{/if}
    </span>
    <span class="divider" class:inter>{inter ? '.' : '/'}</span>
    <span class="result" class:selected={value !== null} class:not-selected={value === null}>
      {#if value === null}--{:else}{value.getFullYear()}{/if}
    </span>
    {#if withTime}
      <span class="divider max"> &mdash; </span>
      <span class="result" class:selected={value !== null} class:not-selected={value === null} class:highlight={!inter && bigDay}>
        {#if value === null}--{:else}{zeroLead(value.getHours())}{/if}
      </span>
      <span class="divider">:</span>
      <span class="result" class:selected={value !== null} class:not-selected={value === null}>
        {#if value === null}--{:else}{zeroLead(value.getMinutes())}{/if}
      </span>
    {/if}
  </div>
{/if}
