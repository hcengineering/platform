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
  import core, { Class, Doc, DOMAIN_STATUS, Ref, RefTo } from '@hcengineering/core'
  import { TypeRef } from '@hcengineering/model'
  import { getClient } from '@hcengineering/presentation'
  import { DropdownLabelsIntl, Label } from '@hcengineering/ui'
  import view from '@hcengineering/view-resources/src/plugin'
  import card from '@hcengineering/card'
  import { createEventDispatcher } from 'svelte'
  import type { ButtonKind, ButtonSize, DropdownIntlItem } from '@hcengineering/ui'
  import contactPlugin from '@hcengineering/contact'

  export let type: RefTo<Doc> | undefined
  export let editable: boolean = true
  export let kind: ButtonKind = 'regular'
  export let size: ButtonSize = 'medium'
  export let isCard: boolean = false

  const _classes = isCard ? [card.class.Card, contactPlugin.class.Contact] : [core.class.Doc]
  const exclude = !isCard ? [card.class.Card] : []

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  const classes = fillClasses(_classes, exclude)

  function fillClasses (classes: Ref<Class<Doc>>[], exclude: Ref<Class<Doc>>[]): DropdownIntlItem[] {
    const res: DropdownIntlItem[] = []
    const descendants = new Set(
      classes
        .map((p) => hierarchy.getDescendants(p))
        .reduce((a, b) => a.concat(b))
        .filter((p) => p !== card.class.Card)
    )
    // exclude removed card types
    const removedTypes = client.getModel().findAllSync(card.class.MasterTag, { removed: true })
    const excluded = new Set(removedTypes.map((p) => p._id))
    for (const _class of exclude) {
      const desc = hierarchy.getDescendants(_class)
      for (const _id of desc) {
        excluded.add(_id)
      }
    }
    for (const desc of descendants) {
      if (excluded.has(desc)) continue
      const domain = hierarchy.findDomain(desc)
      if (domain === DOMAIN_STATUS || domain === undefined) continue
      if (hierarchy.classHierarchyMixin(desc, view.mixin.AttributeEditor) === undefined) continue
      const _class = hierarchy.getClass(desc)
      if (_class.label === undefined) continue
      res.push({ id: _class._id, label: _class.label })
    }
    return res
  }

  let refClass: Ref<Class<Doc>> | undefined = type?.to

  $: selected = classes.find((p) => p.id === refClass)

  $: refClass !== undefined && dispatch('change', { type: TypeRef(refClass) })
</script>

<div class="hulyModal-content__settingsSet-line">
  <span class="label">
    <Label label={core.string.Class} />
  </span>
  {#if editable}
    <DropdownLabelsIntl label={core.string.Class} items={classes} width="8rem" bind:selected={refClass} {kind} {size} />
  {:else if selected}
    <Label label={selected.label} />
  {/if}
</div>
