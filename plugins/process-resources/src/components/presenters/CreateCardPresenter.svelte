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
  import card, { Card, MasterTag } from '@hcengineering/card'
  import core, { Ref } from '@hcengineering/core'
  import { getClient, IconWithEmoji } from '@hcengineering/presentation'
  import { MethodParams, parseContext, Process, Step } from '@hcengineering/process'
  import { Icon, Label, tooltip } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import plugin from '../../plugin'
  import { getContext } from '../../utils'
  import ContextValuePresenter from '../attributeEditors/ContextValuePresenter.svelte'

  export let step: Step<Card>
  export let process: Process
  export let params: MethodParams<Card>

  const client = getClient()
  $: method = client.getModel().findAllSync(plugin.class.Method, { _id: step.methodId })[0]

  $: contextValue = params.title !== undefined ? parseContext(params.title) : undefined
  $: context = getContext(client, process, core.class.TypeString, 'attribute')

  $: _class = params?._class
    ? (client.getHierarchy().getClass(params._class as Ref<MasterTag>) as MasterTag)
    : undefined
  $: icon = _class?.icon
</script>

<div class="flex-row-center flex-gap-1">
  <Label label={method.label} />:
  {#if icon}
    <div class="icon" use:tooltip={{ label: _class?.label ?? card.string.Card }}>
      <Icon
        icon={icon === view.ids.IconWithEmoji ? IconWithEmoji : icon ?? card.icon.Card}
        iconProps={{ icon: _class?.color }}
        size={'small'}
      />
    </div>
  {/if}
  {#if params.title}
    <div class="title">
      {#if contextValue}
        <ContextValuePresenter {contextValue} {context} {process} />
      {:else}
        {params.title}
      {/if}
    </div>
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
