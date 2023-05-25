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
  import { Event } from '@hcengineering/calendar'
  import { Doc, WithLookup } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { StyledTextBox } from '@hcengineering/text-editor'
  import { AnyComponent, Component, Label, StylishEdit } from '@hcengineering/ui'
  import { getObjectPreview, ObjectPresenter } from '@hcengineering/view-resources'
  import { createEventDispatcher, onMount } from 'svelte'
  import calendar from '../plugin'

  export let object: WithLookup<Event>

  const dispatch = createEventDispatcher()
  const client = getClient()

  onMount(() => {
    dispatch('open', {
      ignoreKeys: ['comments', 'title', 'description'],
      ignoreMixins: [calendar.mixin.Reminder]
    })
  })

  const query = createQuery()
  let doc: Doc | undefined

  $: if (object.attachedTo !== undefined && object.attachedToClass !== undefined) {
    query.query(object.attachedToClass, { _id: object.attachedTo }, (res) => {
      doc = res.shift()
    })
  }

  let presenter: AnyComponent | undefined
  async function updatePreviewPresenter (doc?: Doc): Promise<void> {
    if (doc === undefined) {
      return
    }
    presenter = doc !== undefined ? await getObjectPreview(client, doc._class) : undefined
  }

  $: updatePreviewPresenter(doc)
</script>

{#if object !== undefined}
  {#if object.attachedTo && object.attachedToClass}
    <div class="mb-4">
      <div class="flex-row-center p-1">
        <Label label={calendar.string.EventFor} />
        <div class="ml-2">
          <ObjectPresenter _class={object.attachedToClass} objectId={object.attachedTo} value={doc} />
        </div>
      </div>
      {#if presenter !== undefined && doc}
        <div class="antiPanel p-4">
          <Component is={presenter} props={{ object: doc }} />
        </div>
      {/if}
    </div>
  {/if}
  <div class="mb-2">
    <div class="mb-4">
      <StylishEdit
        label={calendar.string.Title}
        bind:value={object.title}
        on:change={() => client.update(object, { title: object.title })}
      />
    </div>
    <div class="mb-2">
      <StyledTextBox
        kind={'emphasized'}
        content={object.description}
        on:value={(evt) => {
          client.update(object, { description: evt.detail })
        }}
        label={calendar.string.Description}
        placeholder={calendar.string.Description}
      />
    </div>
  </div>
{/if}
