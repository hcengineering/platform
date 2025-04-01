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

  import IconPen from '../../icons/IconPen.svelte'
  import Icon from '../../Icon.svelte'
  import Label from '../../Label.svelte'
  import { isMarkupAttribute } from '../../../activity'
  import ActivityAttributeValue from './ActivityAttributeValue.svelte'
  import uiNext from '../../../plugin'

  export let model: AttributeModel
  export let value: ActivityAttributeUpdate['set']

  $: icon = model.icon ?? IconPen
  $: isUnset = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
</script>

{#if isUnset}
  <span class="flex-presenter">
    <span class="mr-1"><Icon {icon} size="small" /></span>
    <Label label={uiNext.string.Unset} />
    <span class="lower"><Label label={model.label} /></span>
  </span>
{:else if isMarkupAttribute(model)}
  <svelte:component
    this={model.presenter}
    attribute={model.attribute}
    {value}
    withShowMore={false}
    showOnlyDiff={false}
  />
{:else}
  <ActivityAttributeValue {model} {icon} values={value}>
    <svelte:fragment slot="text">
      <Label label={model.label} />
      <span class="lower"><Label label={uiNext.string.Set} /></span>
      <span class="lower"><Label label={uiNext.string.To} /></span>
    </svelte:fragment>
  </ActivityAttributeValue>
{/if}
