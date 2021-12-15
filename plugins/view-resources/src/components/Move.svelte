<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { Label, Button } from '@anticrm/ui'
  import { getClient } from '@anticrm/presentation'

  import core, { AttachedDoc, Collection, Doc, Ref, Space } from '@anticrm/core'
  import { SpaceSelect } from '@anticrm/presentation'
  import { createEventDispatcher } from 'svelte'
  import ui from '@anticrm/ui'
  import view from '../plugin'
  import { translate } from '@anticrm/platform'

  export let object: Doc
  let currentSpace: Space | undefined
  let space: Ref<Space> = object.space
  const client = getClient()
  const dispatch = createEventDispatcher()
  const hierarchy = client.getHierarchy()
  let label = ''
  $: _class = currentSpace ? hierarchy.getClass(currentSpace._class).label : undefined
  let classLabel = ''
  $: translate(hierarchy.getClass(object._class).label, {}).then((res) => (label = res.toLocaleLowerCase()))
  $: _class && translate(_class, {}).then((res) => (classLabel = res.toLocaleLowerCase()))

  async function move (doc: Doc): Promise<void> {
    console.log('start move')
    console.log(doc)
    const attributes = hierarchy.getAllAttributes(doc._class)
    for (const [name, attribute] of attributes) {
      if (hierarchy.isDerived(attribute.type._class, core.class.Collection)) {
        const collection = attribute.type as Collection<AttachedDoc>
        console.log('find collection')
        console.log(collection)
        const allAttached = await client.findAll(collection.of, { attachedTo: doc._id })
        console.log(allAttached)
        for (const attached of allAttached) {
          move(attached).catch((err) => console.log('failed to move', name, err))
        }
      }
    }
    if (doc.space === object.space) {
      console.log('move doc')
      console.log(doc)
      client.updateDoc(doc._class, doc.space, doc._id, {
        space: space
      })
    }
    console.log('close')
    dispatch('close')
  }

  $: client.findOne(core.class.Space, { _id: object.space }).then((res) => (currentSpace = res))
</script>

<div class="container">
  <div class="overflow-label fs-title mb-4">
    <Label label={view.string.MoveClass} params={{ class: label }} />
  </div>
  <div class="content-accent-color mb-4">
    <Label label={view.string.SelectToMove} params={{ class: label, classLabel: classLabel }} />
  </div>
  <div class="spaceSelect">
    {#if currentSpace}
      <SpaceSelect _class={currentSpace._class} label={_class ?? ''} bind:value={space} />
    {/if}
  </div>
  <div class="footer">
    <Button
      label={view.string.Move}
      size={'small'}
      disabled={space === object?.space}
      transparent
      primary
      on:click={() => {
        move(object)
      }}
    />
    <Button
      size={'small'}
      label={view.string.Cancel}
      transparent
      on:click={() => {
        dispatch('close')
      }}
    />
  </div>
</div>

<style lang="scss">
  .container {
    display: flex;
    flex-direction: column;
    padding: 2rem 1.75rem 1.75rem;
    width: 25rem;
    max-width: 40rem;
    background: var(--theme-msgbox-bg);
    border-radius: 1.25rem;
    user-select: none;
    box-shadow: var(--theme-msgbox-shadow);

    .spaceSelect {
      padding: 1rem 1.25rem;
      background-color: var(--theme-button-bg-enabled);
      border: 1px solid var(--theme-bg-accent-color);
      border-radius: .75rem;
    }

    .footer {
      flex-shrink: 0;
      display: grid;
      grid-auto-flow: column;
      direction: rtl;
      justify-content: start;
      align-items: center;
      margin-top: 1rem;
      column-gap: .5rem;
    }
  }
</style>
