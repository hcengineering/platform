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
  import { Person } from '@hcengineering/contact'
  import { Doc, Mixin, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { CheckBox, Label } from '@hcengineering/ui'

  export let value: Person
  export let targetEmp: Person
  export let cast: Ref<Mixin<Doc>> | undefined = undefined
  export let key: string
  export let selected = false
  export let onChange: (key: string, value: boolean) => void

  const client = getClient()
  const hierarchy = client.getHierarchy()

  function isEqual (value: Person, targetEmp: Person, key: string) {
    if (cast !== undefined) {
      value = hierarchy.as(value, cast)
      targetEmp = hierarchy.as(targetEmp, cast)
    }
    if (!(value as any)[key]) return true
    if (!(targetEmp as any)[key]) return true
    return (value as any)[key] === (targetEmp as any)[key]
  }
  $: attribute = hierarchy.findAttribute(cast ?? value._class, key)
</script>

{#if !isEqual(value, targetEmp, key)}
  <div class="box flex-row-center flex-between">
    <div class="ml-4">
      {#if attribute?.label}
        <Label label={attribute.label} />
      {:else}
        {key}
      {/if}
    </div>

    <div class="flex-center">
      <div class="mr-2">
        <CheckBox
          circle
          checked={selected}
          on:value={(e) => {
            selected = false
            onChange(key, false)
          }}
        />
      </div>
      <slot name="item" item={value} />
    </div>
    <div class="flex-row-center" />
    <div class="flex-center">
      <div class="mr-2">
        <CheckBox
          circle
          checked={!selected}
          on:value={(e) => {
            selected = true
            onChange(key, true)
          }}
        />
      </div>
      <slot name="item" item={targetEmp} />
    </div>
  </div>
{/if}

<style lang="scss">
  .box {
    margin: 0.5rem;
    padding: 0.5rem;
    flex-shrink: 0;
    border: 1px dashed var(--accent-color);
    border-radius: 0.25rem;

    font-weight: 500;
    font-size: 0.75rem;

    // text-transform: uppercase;
    color: var(--accent-color);
    &:hover {
      color: var(--caption-color);
    }
  }
</style>
