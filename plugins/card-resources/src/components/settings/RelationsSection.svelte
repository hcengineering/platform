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
  import card, { MasterTag } from '@hcengineering/card'
  import contact from '@hcengineering/contact'
  import core, { Association, Class, Doc, Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import setting from '@hcengineering/setting'
  import { clearSettingsStore, settingsStore } from '@hcengineering/setting-resources'
  import { ButtonIcon, Icon, IconAdd, Label, showPopup } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'

  export let masterTag: MasterTag

  let associations: Association[] = []
  const client = getClient()
  const hierarchy = client.getHierarchy()
  $: descendants = new Set(hierarchy.getDescendants(masterTag._id))

  $: filtered = associations.filter((it) => descendants.has(it.classA) || descendants.has(it.classB))
  const query = createQuery()

  query.query(core.class.Association, {}, (res) => {
    console.log(res)
    associations = res
  })

  function getClassLabel (_class: Ref<Class<Doc>>): IntlString {
    try {
      const _classLabel = hierarchy.getClass(_class)
      return _classLabel.label
    } catch (err) {
      console.error(err)
      return core.string.Class
    }
  }

  function addRelation (): void {
    showPopup(setting.component.CreateRelation, {
      aClass: masterTag._id,
      exclude: [],
      _classes: [card.class.Card, contact.class.Contact]
    })
  }

  const handleSelect = (association: Association): void => {
    $settingsStore = { id: association._id, component: setting.component.EditRelation, props: { association } }
  }
  onDestroy(() => {
    clearSettingsStore()
  })
</script>

<div class="hulyTableAttr-header font-medium-12">
  <Icon icon={setting.icon.Relations} size="small" />
  <span><Label label={core.string.Relations} /></span>
  <ButtonIcon kind="primary" icon={IconAdd} size="small" dataId={'btnAdd'} on:click={addRelation} />
</div>
{#if filtered.length}
  <div class="hulyTableAttr-content task">
    {#each filtered as association}
      <button
        class="hulyTableAttr-content__row justify-start"
        on:click|stopPropagation={() => {
          handleSelect(association)
        }}
      >
        <div class="hulyTableAttr-content__row-label font-medium-14 cursor-pointer">
          {association.nameA} (<Label label={getClassLabel(association.classA)} />) - {association.nameB} (<Label
            label={getClassLabel(association.classB)}
          />)
        </div>
      </button>
    {/each}
  </div>
{/if}
