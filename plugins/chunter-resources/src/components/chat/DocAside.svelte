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
  import core, { Class, Doc, Mixin, Ref, Space } from '@hcengineering/core'
  import {
    AttributeBarEditor,
    getClient,
    getFiltredKeys,
    isCollectionAttr,
    KeyedAttribute
  } from '@hcengineering/presentation'
  import { Scroller } from '@hcengineering/ui'
  import { ClassAttributeBar, getDocMixins } from '@hcengineering/view-resources'
  import { ObjectChatPanel } from '@hcengineering/chunter'

  export let object: Doc
  export let objectChatPanel: ObjectChatPanel | undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let mixins: Array<Mixin<Doc>> = []

  $: mixins = getDocMixins(object)

  function getMixinKeys (mixin: Ref<Mixin<Doc>>): KeyedAttribute[] {
    if (object === undefined) return []

    const mixinClass = hierarchy.getClass(mixin)
    const filtredKeys = getFiltredKeys(
      hierarchy,
      mixin,
      objectChatPanel?.ignoreKeys ?? [],
      hierarchy.isMixin(mixinClass.extends as Ref<Class<Doc>>) ? mixinClass.extends : object._class
    )
    return filtredKeys.filter((key) => !isCollectionAttr(hierarchy, key))
  }

  $: readonly = hierarchy.isDerived(object._class, core.class.Space) ? (object as Space).archived : false
</script>

<Scroller>
  <ClassAttributeBar
    _class={object._class}
    {object}
    ignoreKeys={objectChatPanel?.ignoreKeys ?? []}
    showHeader={false}
    {readonly}
    on:update
  />
  <div class="popupPanel-body__aside-grid">
    {#each mixins as mixin}
      {@const mixinKeys = getMixinKeys(mixin._id)}
      {#if mixinKeys.length}
        <div class="divider" />
        {#each mixinKeys as key (typeof key === 'string' ? key : key.key)}
          <AttributeBarEditor
            {key}
            _class={mixin._id}
            readonly={false}
            object={hierarchy.as(object, mixin._id)}
            showHeader={true}
            size={'medium'}
          />
        {/each}
      {/if}
    {/each}
  </div>
  <slot />
</Scroller>
