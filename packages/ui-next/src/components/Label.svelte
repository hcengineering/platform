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
  import type { IntlString } from '@hcengineering/platform'
  import { translateCB } from '@hcengineering/platform'
  import { themeStore } from '@hcengineering/theme'

  export let label: IntlString
  export let params: Record<string, any> = {}

  let _value: string | undefined

  $: if (label !== undefined) {
    translateCB(label, params ?? {}, $themeStore.language, (r) => {
      _value = r
    })
  } else {
    _value = label
  }
</script>

{#if _value !== undefined}
  {_value}
{:else}
  {label}
{/if}
