<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import type { Doc, Ref } from '@anticrm/core'
  import { CheckBox } from '@anticrm/ui'

  export let id: Ref<Doc>
  export let controlCheckBoxClass: string | undefined
  export let isChecked: boolean | undefined
  export let onSelected: ((id: Ref<Doc>, isChecked: boolean) => void) | undefined

  const handleChanged = (event: Event) => {
    const eventTarget = event.target as HTMLInputElement
    const isChecked = eventTarget.checked

    onSelected?.(id, isChecked)
  }
</script>

<div class={controlCheckBoxClass}>
  <CheckBox checked={isChecked} on:change={handleChanged} />
</div>
