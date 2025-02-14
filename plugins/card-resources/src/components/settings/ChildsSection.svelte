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
  import { MasterTag } from '@hcengineering/card'
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { ClassHierarchy } from '@hcengineering/setting-resources'
  import { ButtonIcon, getCurrentLocation, Icon, IconAdd, Label, navigate, showPopup } from '@hcengineering/ui'
  import card from '../../plugin'
  import CreateTag from '../CreateTag.svelte'
  import TagsHierarchy from './TagsHierarchy.svelte'

  export let masterTag: MasterTag

  const client = getClient()
  const hierarchy = client.getHierarchy()
  let descendants: Ref<Class<Doc>>[] = []
  $: getDescendants(masterTag._id)

  const query = createQuery()

  query.query(card.class.MasterTag, {}, () => {
    getDescendants(masterTag._id)
  })

  function getDescendants (id: Ref<Class<Doc>>): void {
    const desc = hierarchy.getDescendants(id)
    const filtered: Ref<Class<Doc>>[] = []
    for (const _id of desc) {
      const _class = hierarchy.getClass(_id)
      if (_class.extends === id && _class._class === card.class.MasterTag) {
        filtered.push(_id)
        continue
      }
    }
    descendants = filtered
  }

  function open (_class: Ref<Class<Doc>>): void {
    const loc = getCurrentLocation()
    loc.path[4] = _class
    navigate(loc)
  }
</script>

<div class="hulyTableAttr-header font-medium-12">
  <Icon icon={card.icon.MasterTag} size="small" />
  <span><Label label={card.string.MasterTags} /></span>
  <ButtonIcon
    kind="primary"
    icon={IconAdd}
    size="small"
    dataId={'btnAdd'}
    on:click={() => {
      showPopup(CreateTag, {
        parent: masterTag,
        _class: card.class.MasterTag
      })
    }}
  />
</div>
{#if descendants.length}
  <div class="hulyTableAttr-content task">
    <TagsHierarchy
      classes={descendants}
      _class={undefined}
      on:select={(e) => {
        open(e.detail)
      }}
    />
  </div>
{/if}
