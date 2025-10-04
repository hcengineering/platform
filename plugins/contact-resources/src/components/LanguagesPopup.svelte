<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->
<script lang="ts">
  import { SelectPopup, SelectPopupValueType } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { getEmbeddedLabel } from '@hcengineering/platform'

  import { languagesDisplayData } from '../translation'
  import LanguageIcon from './LanguageIcon.svelte'

  export let selected: string[] = []

  const dispatch = createEventDispatcher()

  let items: SelectPopupValueType[] = []

  $: items = Object.entries(languagesDisplayData).map(([lang, data]) => ({
    id: lang,
    label: getEmbeddedLabel(data.label),
    icon: LanguageIcon,
    iconProps: { lang },
    isSelected: selected.includes(lang)
  }))

  function onSelect (lang?: string | null | number): void {
    if (lang == null) return
    items = items.map((it) => {
      if (it.id === lang) {
        return { ...it, isSelected: !it.isSelected }
      }
      return it
    })

    if (selected.includes(lang as string)) {
      selected = selected.filter((l) => l !== lang)
    } else {
      selected = [...selected, lang as string]
    }

    dispatch('update', selected)
  }
</script>

<SelectPopup
  value={items}
  {onSelect}
  on:close={() => {
    dispatch('close', selected)
  }}
/>
