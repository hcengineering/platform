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
  import { Doc, Class, Ref, updateAttribute } from '@hcengineering/core'

  import { IntlString } from '@hcengineering/platform'
  import { createQuery, getAttribute, getClient, KeyedAttribute } from '@hcengineering/presentation'
  import { navigate } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { getObjectLinkFragment } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import AttachmentStyledBox from './AttachmentStyledBox.svelte'

  export let object: Doc
  export let key: KeyedAttribute
  export let placeholder: IntlString
  export let focusIndex = -1
  export let boundary: HTMLElement | undefined = undefined
  const client = getClient()

  const queryClient = createQuery()

  let description: string
  let prevObjectId: Ref<Doc>
  let prevObjectClass: Ref<Class<Doc>>

  let haveUnsavedChanges = false

  /*
    There is no onMount when go from one issue to another one via mention
    There is a change of object when chaning a description.
    So the only way to detect if we really need to re-init the state
    is to check if object class and object id changed.
  */
  $: if (object && (object._id !== prevObjectId || object._class !== prevObjectClass)) {
    description = getAttribute(client, object, key)
    prevObjectId = object._id
    prevObjectClass = object._class
  }

  // We need to query the document one more time
  // To make a difference between update of description from the bottom
  // And update to if from another tab.

  $: object &&
    queryClient.query(object._class, { _id: object._id }, async (result: Doc[]) => {
      if (result.length > 0) {
        if (!haveUnsavedChanges) {
          const doc = result[0]
          description = getAttribute(client, doc, key)
        }
      }
    })

  const dispatch = createEventDispatcher()

  let descriptionBox: AttachmentStyledBox

  async function save (object: Doc, description: string) {
    clearTimeout(saveTrigger)
    if (!object) {
      return
    }

    const old = getAttribute(client, object, key)
    if (description !== old) {
      await updateAttribute(client, object, object._class, key, description)
      haveUnsavedChanges = false
      dispatch('saved', true)
      setTimeout(() => {
        dispatch('saved', false)
      }, 2500)
    } else {
      haveUnsavedChanges = false
    }

    await descriptionBox.createAttachments()
  }

  let saveTrigger: any
  function triggerSave (): void {
    haveUnsavedChanges = true
    clearTimeout(saveTrigger)

    // Need to bind which object to save, because object could
    // change after we have set timeout
    const saveObject = object
    const saveDescription = description

    saveTrigger = setTimeout(() => save(saveObject, saveDescription), 2500)
  }

  export function isFocused (): boolean {
    return descriptionBox.isFocused()
  }
</script>

{#key object?._id}
  <AttachmentStyledBox
    {focusIndex}
    enableBackReferences={true}
    bind:this={descriptionBox}
    useAttachmentPreview={false}
    isScrollable={false}
    objectId={object._id}
    _class={object._class}
    space={object.space}
    alwaysEdit
    useDirectAttachDelete
    showButtons
    on:blur={() => save(object, description)}
    on:changeContent={triggerSave}
    maxHeight={'card'}
    focusable
    bind:content={description}
    {placeholder}
    {boundary}
    on:open-document={async (event) => {
      save(object, description)
      const doc = await client.findOne(event.detail._class, { _id: event.detail._id })
      if (doc != null) {
        const location = await getObjectLinkFragment(client.getHierarchy(), doc, {}, view.component.EditDoc)
        navigate(location)
      }
    }}
  />
{/key}
