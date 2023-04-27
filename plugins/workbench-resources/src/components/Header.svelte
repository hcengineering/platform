<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import type { Class, Doc, Ref, Space } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { AnyComponent, LinkWrapper } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { DocNavLink } from '@hcengineering/view-resources'
  import plugin from '../plugin'
  // import { classIcon } from '../utils'

  export let space: Space
  export let _class: Ref<Class<Doc>> | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: description = space.description

  function getEditor (_class: Ref<Class<Doc>>): AnyComponent | undefined {
    const clazz = hierarchy.getClass(_class)
    const editorMixin = hierarchy.as(clazz, view.mixin.ObjectEditor)
    if (editorMixin?.editor == null && clazz.extends != null) return getEditor(clazz.extends)
    return editorMixin.editor
  }

  // const icon = classIcon(client, space._class)
  const editor = getEditor(space._class) ?? plugin.component.SpacePanel
</script>

<div class="ac-header__wrap-description">
  <div class="flex-row-center clear-mins">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <DocNavLink object={space} component={editor}>
      <div class="ac-header__wrap-title">
        <!-- {#if icon}<div class="ac-header__icon"><Icon {icon} size={'small'} /></div>{/if} -->
        <span class="ac-header__title">{space.name}</span>
      </div>
    </DocNavLink>
  </div>
  {#if description}
    <span class="ac-header__description">
      <div class="flex">
        <span class="overflow-label" title={description}>
          <LinkWrapper text={description} />
        </span>
      </div>
    </span>{/if}
</div>

<style lang="scss">
  .ac-header__wrap-title:hover {
    span {
      text-decoration: underline;
    }
  }
</style>
