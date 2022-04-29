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
  import type { IntlString } from '@anticrm/platform'
  import { EditBox } from '@anticrm/ui'

  // export let label: IntlString
  export let placeholder: IntlString
  export let value: any
  export let focus: boolean
  export let maxWidth: string
  export let onChange: (value: string) => void

  function _onchange (ev: Event) {
    onChange((ev.target as HTMLInputElement).value)
  }
</script>

<EditBox {placeholder} {maxWidth} bind:value {focus} on:change={_onchange} />
