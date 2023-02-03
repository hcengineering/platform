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
  import { Doc, Mixin } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import setting from '@hcengineering/setting'
  import ClassAttributeBar from './ClassAttributeBar.svelte'

  export let object: Doc
  export let mixins: Mixin<Doc>[] = []
  export let ignoreKeys: string[]
  export let allowedCollections: string[] = []

  const client = getClient()
  const hierarchy = client.getHierarchy()
</script>

<ClassAttributeBar _class={object._class} {object} {ignoreKeys} to={undefined} {allowedCollections} on:update />
{#each mixins as mixin}
  {@const to = !hierarchy.hasMixin(mixin, setting.mixin.UserMixin) ? object._class : mixin.extends}
  {#if !hierarchy.hasMixin(mixin, setting.mixin.Editable) || hierarchy.as(mixin, setting.mixin.Editable).value}
    {#key mixin._id}
      <ClassAttributeBar
        _class={mixin._id}
        object={hierarchy.as(object, mixin._id)}
        {ignoreKeys}
        {to}
        {allowedCollections}
        on:update
      />
    {/key}
  {/if}
{/each}
