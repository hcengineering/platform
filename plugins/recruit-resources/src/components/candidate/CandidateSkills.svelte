<!--
  Copyright © 2020 Anticrm Platform Contributors.

  Licensed under the Eclipse Public License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License. You may
  obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

  See the License for the specific language governing permissions and
  limitations under the License.
-->
<script lang="ts">
  import { Component } from '@hcengineering/ui'
  import tags, { TagElement, TagReference } from '@hcengineering/tags'
  import core, { Ref, Doc, PersonId } from '@hcengineering/core'
  import { generateId } from '@hcengineering/core'
  import recruit from '../../plugin'

  export let object: any
  export let loading = false
  export let elements: Map<Ref<TagElement>, TagElement>
  export let newElements: TagElement[]
  export let key: any

  function addTagRef(tag: TagElement): void {
    object.skills = [
      ...object.skills,
      {
        _class: tags.class.TagReference,
        _id: generateId(),
        attachedTo: '' as Ref<Doc>,
        attachedToClass: recruit.mixin.Candidate,
        collection: 'skills',
        space: core.space.Workspace,
        modifiedOn: 0,
        modifiedBy: '' as PersonId,
        title: tag.title,
        tag: tag._id,
        color: tag.color
      }
    ]
  }
</script>

<Component
  is={tags.component.TagsDropdownEditor}
  props={{
    disabled: loading,
    focusIndex: 102,
    items: object.skills,
    key,
    targetClass: recruit.mixin.Candidate,
    showTitle: false,
    elements,
    newElements,
    countLabel: recruit.string.NumberSkills,
    kind: 'regular',
    size: 'large'
  }}
  on:open={({ detail }) => {
    addTagRef(detail)
  }}
  on:delete={({ detail }) => {
    object.skills = object.skills.filter((it) => it.tag !== detail._id)
  }}
/>
{#if object.skills.length > 0}
  <div class="antiComponent antiEmphasized w-full flex-grow mt-2">
    <Component
      is={tags.component.TagsEditor}
      props={{
        disabled: loading,
        focusIndex: 102,
        items: object.skills,
        key,
        targetClass: recruit.mixin.Candidate,
        showTitle: false,
        elements,
        newElements,
        countLabel: recruit.string.NumberSkills
      }}
      on:open={({ detail }) => {
        addTagRef(detail)
      }}
      on:delete={({ detail }) => {
        object.skills = object.skills.filter((it) => it._id !== detail)
      }}
      on:change={({ detail }) => {
        detail.tag.weight = detail.tag.weight
        object.skills = object.skills
      }}
    />
  </div>
{:else}
  <div class="flex-grow w-full" style="margin: 0" />
{/if} 