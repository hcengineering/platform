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
  import { AnyAttribute } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { MethodParams, Process, Step } from '@hcengineering/process'
  import { Icon, IconError, Label, tooltip } from '@hcengineering/ui'
  import plugin from '../../plugin'
  import UpdateAttributePresenter from './UpdateAttributePresenter.svelte'

  export let step: Step<Card>
  export let process: Process
  export let params: MethodParams<Card>

  const client = getClient()
  $: method = client.getModel().findAllSync(plugin.class.Method, { _id: step.methodId })[0]
</script>

{#if Object.keys(params).length === 0}
  <div class="mr-2" use:tooltip={{ label: plugin.string.NoAttributesForUpdate }}>
    <Icon icon={IconError} size="medium" />
  </div>
{/if}
<div class="flex-row-center flex-gap-1">
  <Label label={method.label} />
  {#if Object.keys(params).length > 0}
    :
    {#each Object.entries(params) as [key, value]}
      <UpdateAttributePresenter {process} {key} {value} />
    {/each}
  {/if}
</div>

<style lang="scss">
  .title {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--theme-caption-color);
  }
</style>
