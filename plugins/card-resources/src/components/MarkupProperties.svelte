<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import attachment from '@hcengineering/attachment'
  import { Card, Tag } from '@hcengineering/card'
  import core, { Blob, Class, Doc, Ref, toRank } from '@hcengineering/core'
  import { getResource, setPlatformStatus, unknownError } from '@hcengineering/platform'
  import { getClient, KeyedAttribute, updateAttribute } from '@hcengineering/presentation'
  import { isEmptyMarkup } from '@hcengineering/text'
  import { Label } from '@hcengineering/ui'
  import { MarkupEditor } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'

  export let doc: Card
  export let tag: Tag | undefined
  export let readonly: boolean = false

  let keys: KeyedAttribute[] = []

  const dispatch = createEventDispatcher()

  const client = getClient()
  const hierarchy = client.getHierarchy()

  function updateKeys (_class: Ref<Class<Doc>>, to: Ref<Class<Doc>> | undefined): void {
    const filtredKeys = [...hierarchy.getAllAttributes(_class, to).entries()]
      .filter(([key, value]) => value.hidden !== true && value.type._class === core.class.TypeMarkup)
      .map(([key, attr]) => ({ key, attr }))

    keys = filtredKeys.sort((a, b) => {
      const rankA = a.attr.rank ?? toRank(a.attr._id) ?? ''
      const rankB = b.attr.rank ?? toRank(b.attr._id) ?? ''
      return rankA.localeCompare(rankB)
    })
  }

  $: _class = tag?._id ?? doc._class
  $: to = tag?.extends
  $: updateKeys(_class, to)

  function getValue (doc: Card, key: string): string {
    const target = tag !== undefined ? hierarchy.as(doc, tag._id) : doc
    return (target as any)[key]
  }

  function onChange (value: any, attr: KeyedAttribute): void {
    dispatch('update', { key: attr, value })

    void updateAttribute(client, doc, doc._class, attr, value, false, {
      objectId: doc._id
    })
  }

  async function attachFile (file: File): Promise<{ file: Ref<Blob>, type: string } | undefined> {
    try {
      const uploadFile = await getResource(attachment.helper.UploadFile)
      const { uuid } = await uploadFile(file)
      return { file: uuid, type: file.type }
    } catch (err: any) {
      await setPlatformStatus(unknownError(err))
    }
  }
</script>

{#each keys as key}
  {@const val = getValue(doc, key.key)}
  {@const isRequiredAndEmpty = (key.attr.required ?? false) && isEmptyMarkup(val)}
  <div class="w-full mt-2">
    <span class:required-empty-label={isRequiredAndEmpty}>
      <Label label={key.attr.label} />
      {#if key.attr.required}
        <span class="required-asterisk">*</span>
      {/if}
    </span>
    <div>
      <MarkupEditor
        value={val}
        onChange={(value) => {
          onChange(value, key)
        }}
        {readonly}
        {attachFile}
      />
    </div>
  </div>
{/each}

<style lang="scss">
  .required-empty-label {
    color: var(--theme-error-color, #eb5757) !important;
  }
  .required-asterisk {
    color: var(--theme-error-color, #eb5757);
    margin-left: 2px;
  }
</style>
