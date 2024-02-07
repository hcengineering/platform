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
  import { Class, Doc, Mixin, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Label, Scroller } from '@hcengineering/ui'
  import { DocAttributeBar, DocNavLink, getDocLinkTitle, getDocMixins } from '@hcengineering/view-resources'

  import chunter from '../../plugin'

  export let _id: Ref<Doc>
  export let _class: Ref<Class<Doc>>
  export let object: Doc | undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let mixins: Array<Mixin<Doc>> = []
  let objectLinkTitle: string | undefined = undefined

  $: clazz = hierarchy.getClass(_class)
  $: objectChatPanel = hierarchy.classHierarchyMixin(_class, chunter.mixin.ObjectChatPanel)

  $: mixins = object ? getDocMixins(object) : []

  $: getDocLinkTitle(client, _id, _class, object).then((res) => {
    objectLinkTitle = res
  })
</script>

<Scroller>
  {#if object}
    <DocAttributeBar {object} {mixins} ignoreKeys={objectChatPanel?.ignoreKeys ?? []} showHeader={false} />
  {/if}
  <slot />
</Scroller>

<style lang="scss">
  .header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex-shrink: 0;
    margin: 0.75rem;
    padding: 0 0.75rem;
    color: var(--theme-content-color);
    margin-bottom: 0;
  }

  .identifier {
    display: flex;
    gap: 0.25rem;
    color: var(--theme-halfcontent-color);
    font-size: 0.75rem;
  }
</style>
