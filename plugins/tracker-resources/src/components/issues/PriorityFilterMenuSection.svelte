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
  import { translate } from '@anticrm/platform'
  import { IssuePriority } from '@anticrm/tracker'
  import { IconNavPrev } from '@anticrm/ui'
  import FilterMenuSection from '../FilterMenuSection.svelte'
  import tracker from '../../plugin'
  import { FilterSectionElement, issuePriorities } from '../../utils'

  export let selectedElements: any[] = []
  export let groups: { [key: string]: number }
  export let index: number = 0
  export let onUpdate: (result: { [p: string]: any }, filterIndex?: number) => void
  export let onBack: (() => void) | undefined = undefined

  const getFilterElements = async (groups: { [key: string]: number }, selected: any[]) => {
    const elements: FilterSectionElement[] = onBack
      ? [
          {
            icon: IconNavPrev,
            title: await translate(tracker.string.Back, {}),
            onSelect: onBack
          }
        ]
      : []

    for (const [key, value] of Object.entries(groups)) {
      const priority = Number(key) as IssuePriority
      const assets = issuePriorities[priority]

      if (!assets) {
        continue
      }

      elements.push({
        icon: assets.icon,
        title: await translate(assets.label, {}),
        count: value,
        isSelected: selected.includes(priority),
        onSelect: () => onUpdate({ priority }, index)
      })
    }

    return elements
  }
</script>

{#await getFilterElements(groups, selectedElements) then actions}
  <FilterMenuSection {actions} {onBack} on:close />
{/await}
