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
  import { AttributeModel } from '@hcengineering/view'
  import { ActivityAttributeUpdate } from '@hcengineering/communication-types'
  import { getClient } from '@hcengineering/presentation'
  import { Class, Ref } from '@hcengineering/core'
  import { Card } from '@hcengineering/card'
  import { Component } from '@hcengineering/ui'

  import ActivitySetAttributesViewer from './ActivitySetAttributeViewer.svelte'
  import ActivityAddAttributeViewer from './ActivityAddAttributeViewer.svelte'
  import ActivityRemoveAttributeViewer from './ActivityRemoveAttributeViewer.svelte'
  import communication from '../../../plugin'

  export let model: AttributeModel | undefined
  export let update: ActivityAttributeUpdate
  export let cardType: Ref<Class<Card>>

  const client = getClient()
  $: customPresenter = client.getModel().findAllSync(communication.class.CustomActivityPresenter, {
    attribute: update.attrKey,
    type: cardType
  })[0]
</script>

{#if customPresenter}
  <Component is={customPresenter.component} props={{ update }} />
{:else}
  {#if update?.set !== undefined && model}
    <ActivitySetAttributesViewer {model} value={update.set} />
  {/if}

  {#if model && (update.added?.length ?? 0) > 0}
    <ActivityAddAttributeViewer {model} value={update.added ?? []} />
  {/if}

  {#if model && (update.removed?.length ?? 0) > 0}
    <ActivityRemoveAttributeViewer {model} value={update.removed ?? []} />
  {/if}
{/if}
