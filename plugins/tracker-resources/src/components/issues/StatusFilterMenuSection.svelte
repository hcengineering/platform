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
  import { WithLookup } from '@anticrm/core'
  import { translate } from '@anticrm/platform'
  import { IssueStatus } from '@anticrm/tracker'
  import { IconNavPrev } from '@anticrm/ui'
  import FilterMenuSection from '../FilterMenuSection.svelte'
  import tracker from '../../plugin'
  import { FilterSectionElement } from '../../utils'

  export let selectedElements: any[] = []
  export let statuses: Array<WithLookup<IssueStatus>> = []
  export let groups: { [key: string]: number }
  export let onUpdate: (result: { [p: string]: any }) => void
  export let onBack: () => void

  let backButtonTitle = ''

  $: actions = getFilterElements(groups, statuses, selectedElements, backButtonTitle)

  $: translate(tracker.string.Back, {}).then((result) => {
    backButtonTitle = result
  })

  const getFilterElements = (
    groups: { [key: string]: number },
    defaultStatuses: Array<WithLookup<IssueStatus>>,
    selected: any[],
    backButtonTitle: string
  ) => {
    const elements: FilterSectionElement[] = [
      {
        icon: IconNavPrev,
        title: backButtonTitle,
        onSelect: onBack
      }
    ]

    for (const [key, value] of Object.entries(groups)) {
      const status = defaultStatuses.find((x) => x._id === key)

      if (!status) {
        continue
      }

      elements.push({
        icon: status.$lookup?.category?.icon,
        title: status.name,
        count: value,
        isSelected: selected.includes(key),
        onSelect: () => onUpdate({ status: key })
      })
    }

    return elements
  }
</script>

<FilterMenuSection {actions} {onBack} on:close />
