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
  import { translate } from '@hcengineering/platform'
  import { IconNavPrev } from '@hcengineering/ui'
  import FilterMenuSection from '../FilterMenuSection.svelte'
  import tracker from '../../plugin'
  import { FilterSectionElement } from '../../utils'
  import { getClient } from '@hcengineering/presentation'

  export let selectedElements: any[] = []
  export let groups: { [key: string]: number }
  export let index: number = 0
  export let onUpdate: (result: { [p: string]: any }, filterIndex?: number) => void
  export let onBack: (() => void) | undefined = undefined

  const getFilterElements = async (groups: { [key: string]: number }, selected: any[]) => {
    const elements: FilterSectionElement[] = []

    const client = getClient()
    const components = await client.findAll(tracker.class.Component, {})
    for (const [key, value] of Object.entries(groups)) {
      const component = key === 'null' ? null : key
      const label = component
        ? components.find(({ _id }) => _id === component)?.label
        : await translate(tracker.string.NoComponent, {})

      if (!label) {
        continue
      }
      elements.splice(component ? 1 : 0, 0, {
        icon: tracker.icon.Component,
        title: label,
        count: value,
        isSelected: selected.includes(component),
        onSelect: () => onUpdate({ component }, index)
      })
    }
    return onBack
      ? [
          {
            icon: IconNavPrev,
            title: await translate(tracker.string.Back, {}),
            onSelect: onBack
          },
          ...elements
        ]
      : elements
  }
</script>

{#await getFilterElements(groups, selectedElements) then actions}
  <FilterMenuSection {actions} {onBack} on:close />
{/await}
