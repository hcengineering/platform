<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { getName, Person } from '@hcengineering/contact'
  import { getEmbeddedLabel, IntlString } from '@hcengineering/platform'
  import type { LabelAndProps, IconSize } from '@hcengineering/ui'
  import { personByIdStore, PersonLabelTooltip } from '..'
  import PersonContent from './PersonContent.svelte'
  import { getClient } from '@hcengineering/presentation'
  import { Ref } from '@hcengineering/core'
  import ui from '@hcengineering/ui'

  export let value: Ref<Person> | Person | null | undefined
  export let inline = false
  export let enlargedText = false
  export let disabled = false
  export let shouldShowAvatar = true
  export let shouldShowName = true
  export let shouldShowPlaceholder = false
  export let noUnderline = false
  export let defaultName: IntlString | undefined = ui.string.NotSelected
  export let statusLabel: IntlString | undefined = undefined
  export let tooltipLabels: PersonLabelTooltip | undefined = undefined
  export let avatarSize: IconSize = 'x-small'
  export let onEdit: ((event: MouseEvent) => void) | undefined = undefined
  export let element: HTMLElement | undefined = undefined
  export let colorInherit: boolean = false
  export let accent: boolean = false
  export let maxWidth = ''

  const client = getClient()
  $: personValue = typeof value === 'string' ? $personByIdStore.get(value) : value

  function getTooltip (
    tooltipLabels: PersonLabelTooltip | undefined,
    value: Person | null | undefined
  ): LabelAndProps | undefined {
    if (!tooltipLabels) {
      return !value
        ? undefined
        : {
            label: getEmbeddedLabel(getName(client.getHierarchy(), value))
          }
    }
    const direction = tooltipLabels?.direction
    const component = value ? tooltipLabels.component : undefined
    const label = value
      ? tooltipLabels.personLabel
        ? tooltipLabels.personLabel
        : getEmbeddedLabel(getName(client.getHierarchy(), value))
      : tooltipLabels.placeholderLabel
        ? tooltipLabels.placeholderLabel
        : undefined
    const props = tooltipLabels.props
      ? tooltipLabels.props
      : value
        ? { value: getName(client.getHierarchy(), value) }
        : undefined
    return {
      component,
      label,
      props,
      direction
    }
  }
</script>

{#if value || shouldShowPlaceholder}
  <PersonContent
    showTooltip={getTooltip(tooltipLabels, personValue)}
    value={personValue}
    {inline}
    {onEdit}
    {avatarSize}
    {defaultName}
    {disabled}
    {shouldShowAvatar}
    {shouldShowName}
    {shouldShowPlaceholder}
    {noUnderline}
    {enlargedText}
    {statusLabel}
    {colorInherit}
    {accent}
    {maxWidth}
    bind:element
    on:accent-color
  />
{/if}
