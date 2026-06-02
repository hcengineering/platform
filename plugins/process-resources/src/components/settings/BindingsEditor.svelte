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
  import core, { AnyAttribute, Class, Doc, Ref } from '@hcengineering/core'
  import { getEmbeddedLabel, IntlString } from '@hcengineering/platform'
  import presentation, { Card, getClient } from '@hcengineering/presentation'
  import { Process } from '@hcengineering/process'
  import { Button, eventToHTMLElement, Label, SelectPopup, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import processPlugin from '../../plugin'
  import { isTypeEqual } from '../../utils'

  export let process: Process

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const model = client.getModel()
  const dispatch = createEventDispatcher()

  $: allAttrs = hierarchy.getAllAttributes(process.masterTag as any, core.class.Doc)
  $: allAssociations = model.findAllSync(core.class.Association, {})
  $: allProcesses = model.findAllSync(processPlugin.class.Process, {})

  function isClassLike (obj: Doc | undefined): boolean {
    if (!obj || !obj._class) return false
    return hierarchy.isDerived(obj._class, core.class.Class)
  }

  function resolveMemberOf (memberOf: string | undefined): Ref<Class<Doc>> | undefined {
    if (memberOf === undefined) return process.masterTag as any
    let targetId: string | undefined
    if (memberOf.startsWith('__SLOT_')) {
      const parentSlotId = memberOf.replace(/^__SLOT_(.+)__$/, '$1')
      targetId = process.bindings?.[parentSlotId]
      if (!targetId) {
        const parentObj = model.findObject(parentSlotId as any)
        if (isClassLike(parentObj)) targetId = parentSlotId
      }
    } else {
      targetId = memberOf
    }
    const obj = targetId ? model.findObject(targetId as any) : undefined
    if (isClassLike(obj)) return targetId as Ref<Class<Doc>>
    return undefined
  }

  async function setBinding (slotId: string, e: MouseEvent): Promise<void> {
    const slot = process.requiredSlots?.[slotId]
    if (slot === undefined) return

    const memberOfTag = resolveMemberOf(slot.memberOf)
    if (memberOfTag === undefined) return

    let possible: Array<{ id: string, label?: IntlString, name?: string }> = []

    if (slot.slotKind === 'association') {
      const aAssociations = allAssociations
        .filter((assoc) => {
          return (
            hierarchy.isDerived(process.masterTag as any, assoc.classA) &&
            hierarchy.isDerived(memberOfTag, assoc.classB)
          )
        })
        .map((a) => ({ id: a._id, name: a.nameA }))
      const bAssociations = allAssociations
        .filter((assoc) => {
          return (
            hierarchy.isDerived(process.masterTag as any, assoc.classB) &&
            hierarchy.isDerived(memberOfTag, assoc.classA)
          )
        })
        .map((a) => ({ id: a._id, name: a.nameB }))
      possible = aAssociations.concat(bAssociations)
    } else if (slot.slotKind === 'process') {
      possible = allProcesses
        .filter((proc) => hierarchy.isDerived(memberOfTag, proc.masterTag))
        .map((p) => ({ id: p._id, name: p.name }))
    } else if (slot.slotKind === 'class') {
      let descendants: string[] = []
      try {
        descendants = hierarchy.getDescendants(core.class.Obj)
      } catch (e) {}
      possible = descendants
        .map((id) => model.findObject(id as any))
        .filter((c) => c && !(c as any).hidden && isClassLike(c))
        .map((c: any) => ({ id: c._id, label: c.label, name: c.name }))
    } else {
      // Default: attribute matching
      const attributes = hierarchy.getAllAttributes(memberOfTag, core.class.Doc)
      possible = Array.from(attributes.values())
        .filter((attr) => !(attr.hidden ?? false) && isTypeEqual(slot as any, attr.type))
        .map((a) => ({ id: a.name, label: a.label, name: a.name }))
    }

    showPopup(
      SelectPopup,
      {
        value: possible.map((p) => ({ id: p.id, label: p.label, text: p.name }))
      },
      eventToHTMLElement(e),
      async (res) => {
        if (res != null) {
          const bindings = { ...(process.bindings ?? {}) }
          bindings[slotId] = res as string
          await client.update(process, { bindings })
        }
      }
    )
  }

  function getBindingLabel (
    allAttrs: Map<string, AnyAttribute>,
    bindings: Record<string, string> | undefined,
    id: string
  ): any {
    if (bindings?.[id] === undefined) return presentation.string.NotSelected
    const value = bindings[id]

    // Search in resolved memberOf tag's attributes
    const slot = process.requiredSlots?.[id]
    const memberOfTag = slot?.memberOf !== undefined ? resolveMemberOf(slot.memberOf) : (process.masterTag as any)
    const searchTag = memberOfTag ?? process.masterTag

    try {
      const attrs = hierarchy.getAllAttributes(searchTag, core.class.Doc)
      const attr = Array.from(attrs.values()).find((a) => a.name === value)
      if (attr !== undefined) return attr.label
    } catch (e) {}

    // Also check masterTag if different
    if (searchTag !== process.masterTag) {
      const attr = Array.from(allAttrs.values()).find((a) => a.name === value)
      if (attr !== undefined) return attr.label
    }

    const assoc = allAssociations.find((a) => a._id === value)
    if (assoc !== undefined) return getEmbeddedLabel(assoc.nameA)

    const proc = allProcesses.find((p) => p._id === value)
    if (proc !== undefined) return getEmbeddedLabel(proc.name)

    const cls = model.findObject(value as any)
    if (isClassLike(cls)) return (cls as Class<Doc>).label

    return value
  }
</script>

<Card
  label={processPlugin.string.Bindings}
  canSave={true}
  width="small"
  okLabel={presentation.string.Save}
  okAction={() => {
    dispatch('close')
  }}
  on:close
>
  <div class="flex-column flex-gap-4">
    {#each Object.entries(process.requiredSlots ?? {}) as [id, slot]}
      <div class="flex-column flex-gap-1">
        <Label label={slot.label ?? getEmbeddedLabel(slot.name ?? '')} />
        <Button
          label={getBindingLabel(allAttrs, process.bindings, id)}
          disabled={slot.memberOf !== undefined && resolveMemberOf(slot.memberOf) === undefined}
          kind="secondary"
          width="100%"
          on:click={(e) => setBinding(id, e)}
        />
      </div>
    {/each}
    {#if Object.keys(process.requiredSlots ?? {}).length === 0}
      <div class="opacity-40 text-center py-4">No slots defined for this process</div>
    {/if}
  </div>
</Card>
