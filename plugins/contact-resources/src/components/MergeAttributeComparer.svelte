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
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { getAttribute, getAttributeEditor, getClient } from '@hcengineering/presentation'
  import MergeComparer from './MergeComparer.svelte'

  export let value: Person
  export let _class: Ref<Class<Doc>>
  export let targetEmp: Person
  export let key: string
  export let onChange: (key: string, value: boolean) => void
  export let selected = false

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const editor = getAttributeEditor(client, _class, key)
  const attribute = hierarchy.getAttribute(_class, key)
</script>

{#await editor then instance}
  {#if instance}
    <MergeComparer
      {value}
      {targetEmp}
      {key}
      {onChange}
      cast={hierarchy.isMixin(_class) ? _class : undefined}
      {selected}
    >
      <svelte:fragment slot="item" let:item>
        <svelte:component
          this={instance}
          type={attribute?.type}
          value={getAttribute(client, item, { key, attr: attribute })}
          readonly
          disabled
          space={item.space}
          {focus}
          object={item}
        />
      </svelte:fragment>
    </MergeComparer>
  {/if}
{/await}
