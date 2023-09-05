<!--
// Copyright © 2023 Anticrm Platform Contributors.
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
  import contact, { PersonAccount } from '@hcengineering/contact'
  import chunter, { Backlink, Comment } from '@hcengineering/chunter'
  import view, { ObjectPanel } from '@hcengineering/view'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { AnyComponent, Component, Loading } from '@hcengineering/ui'
  import { Class, Doc, Ref, getCurrentAccount } from '@hcengineering/core'

  export let _id: Ref<Comment> | undefined
  export let embedded: boolean = true

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let comment: Comment | undefined
  const commentQuery = createQuery()
  let loadingComment = true

  $: if (_id !== undefined) {
    commentQuery.query(chunter.class.Comment, { _id }, (res) => {
      ;[comment] = res
      loadingComment = false
    })
  } else {
    commentQuery.unsubscribe()
    loadingComment = false
  }

  let backlinks: Backlink[] = []
  const backlinksQuery = createQuery()
  let loadingBacklinks = true

  const mePerson = (getCurrentAccount() as PersonAccount).person
  let isMeMentioned = false

  $: if (_id !== undefined) {
    backlinksQuery.query(chunter.class.Backlink, { attachedDocId: _id }, (res) => {
      backlinks = res
      for (const backlink of backlinks) {
        if (hierarchy.isDerived(backlink.attachedToClass, contact.class.Person) && mePerson === backlink.attachedTo) {
          isMeMentioned = true
          break
        }
      }
      loadingBacklinks = false
    })
  } else {
    backlinksQuery.unsubscribe()
    loadingBacklinks = false
  }

  let attachedDocId: Ref<Doc> | undefined
  let attachedDocClass: Ref<Class<Doc>> | undefined

  $: loading = loadingComment || loadingBacklinks

  let component: AnyComponent
  $: getComponent(loading, comment)

  async function getComponent (loading: boolean, comment?: Comment): Promise<void> {
    if (comment == null || loading) {
      return
    }

    let panelComponent: ObjectPanel | undefined
    if (isMeMentioned) {
      panelComponent = hierarchy.classHierarchyMixin(comment.attachedToClass, view.mixin.ObjectPanel)
    }

    component = panelComponent?.component ?? view.component.EditDoc

    attachedDocId = comment.attachedTo
    attachedDocClass = comment.attachedToClass
  }
</script>

{#if loading}
  <Loading />
{:else if component && attachedDocId && attachedDocClass}
  <Component is={component} props={{ _id: attachedDocId, _class: attachedDocClass, embedded }} on:close />
{/if}
