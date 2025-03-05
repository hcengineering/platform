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
  import cardPlugin from '@hcengineering/card'
  import core, { Class, Doc, Ref } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import presentation, { Card, getClient } from '@hcengineering/presentation'
  import { DropdownIntlItem, DropdownLabelsIntl, EditBox, Label } from '@hcengineering/ui'
  import NestedDropdown from '@hcengineering/ui/src/components/NestedDropdown.svelte'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import setting from '../plugin'

  export let _classes: Ref<Class<Doc>>[] = [core.class.Doc]
  export let exclude: Ref<Class<Doc>>[] = [cardPlugin.class.Card]

  const dispatch = createEventDispatcher()

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const descendants = new Set(_classes.map((p) => hierarchy.getDescendants(p)).reduce((a, b) => a.concat(b)))
  const viewlets = new Set(
    client
      .getModel()
      .findAllSync(view.class.Viewlet, { descriptor: view.viewlet.Table })
      .map((p) => p.attachTo)
  )

  function filterClasses (
    descendants: Set<Ref<Class<Doc>>>,
    viewlets: Set<Ref<Class<Doc>>>,
    exclude: Ref<Class<Doc>>[]
  ): [DropdownIntlItem, DropdownIntlItem[]][] {
    const ignore = new Set<Ref<Class<Doc>>>()
    const added = new Set<Ref<Class<Doc>>>()
    const base = new Map<Ref<Class<Doc>>, Class<Doc>[]>()
    for (const excluded of exclude) {
      const desc = hierarchy.getDescendants(excluded)
      for (const _id of desc) {
        ignore.add(_id)
      }
    }
    for (const _id of descendants) {
      if (added.has(_id) || ignore.has(_id)) continue
      const _class = hierarchy.getClass(_id)
      if (_class.label === undefined) continue
      try {
        if (viewlets.has(hierarchy.getBaseClass(_id))) {
          added.add(_id)
          const descendants = hierarchy.getDescendants(_id)
          const toAdd: Class<Doc>[] = []
          for (const desc of descendants) {
            if (added.has(desc) || ignore.has(desc)) continue
            const _class = hierarchy.getClass(desc)
            if (_class.label === undefined) continue
            added.add(desc)
            toAdd.push(_class)
          }
          base.set(_id, toAdd)
        }
      } catch (err) {
        ignore.add(_id)
      }
    }
    const result: [DropdownIntlItem, DropdownIntlItem[]][] = []
    for (const [key, value] of base) {
      try {
        const clazz = hierarchy.getClass(key)
        result.push([{ id: key, label: clazz.label }, value.map((it) => ({ id: it._id, label: it.label }))])
      } catch {}
    }
    return result
  }

  const classes = filterClasses(descendants, viewlets, exclude)

  let classARef: Ref<Class<Doc>> | undefined = undefined
  let classBRef: Ref<Class<Doc>> | undefined = undefined
  let nameA: string = ''
  let nameB: string = ''

  async function save (): Promise<void> {
    if (classBRef === undefined || classARef === undefined) {
      return
    }
    await client.createDoc(core.class.Association, core.space.Model, {
      classA: classARef,
      classB: classBRef,
      type: mode,
      nameA,
      nameB
    })
    dispatch('close')
  }

  const items: DropdownIntlItem[] = [
    {
      id: '1:1',
      label: getEmbeddedLabel('1:1')
    },
    {
      id: '1:N',
      label: getEmbeddedLabel('1:N')
    },
    {
      id: 'N:N',
      label: getEmbeddedLabel('N:N')
    }
  ]

  let mode: '1:1' | '1:N' | 'N:N' = 'N:N' as '1:1' | '1:N' | 'N:N'
</script>

<Card
  label={core.string.AddRelation}
  okLabel={presentation.string.Create}
  canSave={nameB.trim() !== '' && nameA.trim() !== '' && classARef !== undefined && classBRef !== undefined}
  okAction={save}
  on:close
>
  <div class="flex-between flex-gap-4">
    <div class="flex-col p-4 flex-gap-2">
      <div class="flex-col-center">A</div>
      <div>
        <EditBox bind:value={nameA} placeholder={core.string.Name} kind={'default'} />
      </div>
      <div>
        <NestedDropdown
          items={classes}
          on:selected={(e) => {
            classARef = e.detail
          }}
        />
      </div>
    </div>

    <div class="flex-col p-4 flex-gap-2">
      <span class="label">
        <Label label={setting.string.Type} />
      </span>
      <DropdownLabelsIntl
        selected={mode}
        {items}
        label={setting.string.Type}
        on:selected={(res) => {
          mode = res.detail
        }}
      />
    </div>

    <div class="flex-col p-4 flex-gap-2">
      <div class="flex-col-center">B</div>
      <div>
        <EditBox bind:value={nameB} placeholder={core.string.Name} kind={'default'} />
      </div>
      <div>
        <NestedDropdown
          items={classes}
          on:selected={(e) => {
            classBRef = e.detail
          }}
        />
      </div>
    </div>
  </div>
</Card>
