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
  import { Class, Doc, Markup, Ref, updateAttribute } from '@hcengineering/core'

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
  export let updateBacklinks: ((doc: Doc, description: Markup) => void) | undefined = undefined
  let _id: Ref<Doc> | undefined = undefined
  let _class: Ref<Class<Doc>> | undefined = undefined
  const client = getClient()

  const queryClient = createQuery()

  let description = ''

  let doc: Doc | undefined
  function checkForNewObject (object: Doc) {
    if (object._id !== _id) return true
    if (object._class !== _class) return true
    return false
  }
  $: object &&
    queryClient.query(object._class, { _id: object._id }, async (result) => {
      ;[doc] = result
      if (doc && checkForNewObject(object)) {
        _class = object._class
        _id = object._id
        description = getAttribute(client, object, key)
      }
    })

  const dispatch = createEventDispatcher()

  let descriptionBox: AttachmentStyledBox

  async function save () {
    clearTimeout(saveTrigger)
    if (!object) {
      return
    }

    const old = getAttribute(client, object, key)
    if (description !== old) {
      await updateAttribute(client, object, object._class, key, description)
      dispatch('saved', true)
      setTimeout(() => {
        dispatch('saved', false)
      }, 2500)
      updateBacklinks?.(object, description)
    }

    await descriptionBox.createAttachments()
  }

  let saveTrigger: any
  function triggerSave (): void {
    clearTimeout(saveTrigger)
    saveTrigger = setTimeout(save, 2500)
  }

  export function isFocused (): boolean {
    return descriptionBox.isFocused()
  }
</script>

{#key doc?._id}
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
    on:attached={(e) => descriptionBox.saveNewAttachment(e.detail)}
    on:detached={(e) => descriptionBox.removeAttachmentById(e.detail)}
    showButtons
    on:blur={save}
    on:changeContent={triggerSave}
    maxHeight={'card'}
    focusable
    bind:content={description}
    {placeholder}
    on:open-document={async (event) => {
      save()
      const doc = await client.findOne(event.detail._class, { _id: event.detail._id })
      if (doc != null) {
        const location = await getObjectLinkFragment(client.getHierarchy(), doc, {}, view.component.EditDoc)
        navigate(location)
      }
    }}
  />
{/key}
