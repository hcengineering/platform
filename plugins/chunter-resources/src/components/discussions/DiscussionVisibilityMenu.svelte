<!--
//
// Copyright © 2026 TraceX SAS.
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
  import { type Class, type Doc, type ObjectVisibility, type Ref } from '@hcengineering/core'
  import { translate } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import notification from '@hcengineering/notification'
  import { ButtonMenu, type DropdownIntlItem, languageStore } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import chunter from '../../plugin'

  export let value: ObjectVisibility
  export let parentClass: Ref<Class<Doc>> | undefined = undefined
  export let disabled: boolean = false
  export let kind: 'primary' | 'secondary' | 'tertiary' | 'negative' = 'secondary'
  export let size: 'large' | 'medium' | 'small' | 'extra-small' | 'min' = 'medium'
  export let iconOnly: boolean = false
  // The levels offered in the menu, all by default.
  export let levels: ObjectVisibility[] = ['public', 'participants', 'private']

  const dispatch = createEventDispatcher<{ change: ObjectVisibility }>()
  const hierarchy = getClient().getHierarchy()

  let parentLabel = ''
  $: void updateParentLabel(parentClass, $languageStore)

  async function updateParentLabel (_class: Ref<Class<Doc>> | undefined, language: string): Promise<void> {
    const label = _class !== undefined && hierarchy.hasClass(_class) ? hierarchy.getClass(_class).label : undefined
    parentLabel = label !== undefined ? await translate(label, {}, language) : ''
  }

  let allItems: DropdownIntlItem[] = []
  $: allItems = [
    {
      id: 'public',
      icon: chunter.icon.Globe,
      label: chunter.string.VisibilitySpace,
      description: chunter.string.VisibilitySpaceDescription
    },
    {
      id: 'participants',
      icon: chunter.icon.Collaborators,
      // The class label is translated asynchronously.
      label: parentLabel !== '' ? chunter.string.VisibilityParticipants : notification.string.Collaborators,
      params: { label: parentLabel },
      description: chunter.string.VisibilityParticipantsDescription
    },
    {
      id: 'private',
      icon: chunter.icon.Lock,
      label: chunter.string.VisibilityMembers,
      description: chunter.string.VisibilityMembersDescription
    }
  ]

  $: items = allItems.filter((it) => levels.includes(it.id as ObjectVisibility))
  $: current = items.find((it) => it.id === value) ?? items[0]

  function handleSelected (event: CustomEvent<DropdownIntlItem['id']>): void {
    const selected = event.detail as ObjectVisibility
    if (selected !== value) dispatch('change', selected)
  }
</script>

<ButtonMenu
  {items}
  selected={value}
  icon={current.icon}
  label={iconOnly ? undefined : current.label}
  labelParams={current.params ?? {}}
  tooltip={{ label: current.description ?? current.label }}
  {kind}
  {size}
  {disabled}
  dataId="discussionVisibility"
  on:selected={handleSelected}
/>
