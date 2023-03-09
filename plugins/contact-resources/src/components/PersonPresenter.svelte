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
  import { IntlString } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'
  import { LabelAndProps } from '@hcengineering/ui'
  import { PersonLabelTooltip } from '..'
  import PersonContent from './PersonContent.svelte'

  export let value: Person | null | undefined
  export let inline = false
  export let enlargedText = false
  export let isInteractive = true
  export let shouldShowAvatar = true
  export let shouldShowName = true
  export let shouldShowPlaceholder = false
  export let defaultName: IntlString | undefined = undefined
  export let tooltipLabels: PersonLabelTooltip | undefined = undefined
  export let avatarSize: 'inline' | 'tiny' | 'x-small' | 'small' | 'medium' | 'large' | 'x-large' = 'x-small'
  export let onEdit: ((event: MouseEvent) => void) | undefined = undefined

  function getTooltip (
    tooltipLabels: PersonLabelTooltip | undefined,
    value: Person | null | undefined
  ): LabelAndProps | undefined {
    if (!tooltipLabels) {
      return !value
        ? undefined
        : {
            label: presentation.string.InltPropsValue,
            props: { value: getName(value) }
          }
    }
    const component = value ? tooltipLabels.component : undefined
    const label = value
      ? tooltipLabels.personLabel
        ? tooltipLabels.personLabel
        : presentation.string.InltPropsValue
      : undefined
    const props = tooltipLabels.props ? tooltipLabels.props : value ? { value: getName(value) } : undefined
    return {
      component,
      label,
      props
    }
  }
</script>

{#if value || shouldShowPlaceholder}
  <PersonContent
    showTooltip={getTooltip(tooltipLabels, value)}
    {value}
    {inline}
    {onEdit}
    {avatarSize}
    {defaultName}
    {isInteractive}
    {shouldShowAvatar}
    {shouldShowName}
    {shouldShowPlaceholder}
    {enlargedText}
  />
{/if}
