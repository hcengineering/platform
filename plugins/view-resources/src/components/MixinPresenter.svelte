<!--
// Copyright © 2021 Anticrm Platform Contributors.
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
  import type { Doc, Mixin, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { AttributeModel } from '@hcengineering/view'
  import { getObjectPresenter } from '../utils'

  export let mixinClass: Ref<Mixin<Doc>>
  export let value: Doc
  export let props: Record<string, any> = {}
  export let disabled: boolean = false
  export let inline: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()
  let presenter: AttributeModel | undefined

  let mixin: Doc | undefined

  $: if (value && mixinClass) {
    if (hierarchy.hasMixin(value, mixinClass)) {
      mixin = hierarchy.as(value, mixinClass)
    }
  }

  $: if (mixin !== undefined) {
    getObjectPresenter(client, mixinClass, { key: '' })
      .then((p) => {
        presenter = p
      })
      .catch((p) => {
        console.error(`Could not find presenter for ${mixinClass}`)
        throw p
      })
  }
</script>

{#if presenter && mixin}
  <svelte:component this={presenter.presenter} value={mixin} {inline} {disabled} {...props} on:close />
{/if}
