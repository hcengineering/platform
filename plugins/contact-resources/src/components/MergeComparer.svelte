<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Employee } from '@hcengineering/contact'
  import { Doc, Mixin, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Toggle } from '@hcengineering/ui'

  export let value: Employee
  export let targetEmp: Employee
  export let cast: Ref<Mixin<Doc>> | undefined = undefined
  export let key: string
  export let onChange: (key: string, value: boolean) => void

  const client = getClient()
  const hierarchy = client.getHierarchy()

  function isEqual (value: Employee, targetEmp: Employee, key: string) {
    if (cast !== undefined) {
      value = hierarchy.as(value, cast)
      targetEmp = hierarchy.as(targetEmp, cast)
    }
    if (!(value as any)[key]) return true
    if (!(targetEmp as any)[key]) return true
    return (value as any)[key] === (targetEmp as any)[key]
  }
</script>

{#if !isEqual(value, targetEmp, key)}
  <div class="flex-center">
    <slot name="item" item={value} />
  </div>
  <div class="flex-center">
    <Toggle
      on={true}
      on:change={(e) => {
        onChange(key, e.detail)
      }}
    />
  </div>
  <div class="flex-center">
    <slot name="item" item={targetEmp} />
  </div>
{/if}
