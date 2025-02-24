<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { AttachedDoc, Class, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Component } from '@hcengineering/ui'
  import view from '@hcengineering/view'

  export let _id: Ref<AttachedDoc>
  export let _class: Ref<Class<AttachedDoc>>
  export let embedded: boolean = false
  export let props = {}

  const query = createQuery()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let doc: AttachedDoc | undefined = undefined

  $: query.query(_class, { _id }, (res) => {
    doc = res[0]
  })

  $: panelMixin = doc ? hierarchy.classHierarchyMixin(doc.attachedToClass, view.mixin.ObjectPanel) : undefined
  $: panelComponent = panelMixin?.component ?? view.component.EditDoc
</script>

{#if doc && panelComponent}
  <Component
    is={panelComponent}
    props={{ embedded, _id: doc.attachedTo, _class: doc.attachedToClass, selectedDoc: _id, ...props }}
    on:close
  />
{/if}
