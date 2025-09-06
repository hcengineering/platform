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
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { Component, Icon, Label, showPopup } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import contact from '@hcengineering/contact'

  import { createQuery, getClient } from '../../utils'
  import MessageBox from '../MessageBox.svelte'
  import presentation from '../../plugin'

  export let _id: Ref<Doc> | undefined = undefined
  export let _class: Ref<Class<Doc>> | undefined = undefined
  export let title: string = ''
  export let transparent: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const docQuery = createQuery()

  let doc: Doc | undefined = undefined
  let broken: boolean = false
  const withoutDoc: Ref<Doc>[] = [contact.mention.Here, contact.mention.Everyone]

  $: icon =
    _class !== undefined &&
    hierarchy.hasClass(_class) &&
    !withoutDoc.includes(_id as any) &&
    !hierarchy.isDerived(_class, contact.class.Contact)
      ? hierarchy.getClass(_class).icon
      : null

  $: if (_class != null && _id != null && hierarchy.hasClass(_class) && !withoutDoc.includes(_id as any)) {
    docQuery.query(_class, { _id }, (r) => {
      doc = r.shift()
      broken = doc === undefined
    })
  }

  function onBrokenLinkClick (event: MouseEvent): void {
    if (_id !== undefined && withoutDoc.includes(_id)) return
    showPopup(MessageBox, {
      label: presentation.string.UnableToFollowMention,
      message: presentation.string.AccessDenied,
      canSubmit: false
    })
  }
</script>

{#if !doc && title}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <span class="antiMention" class:transparent class:broken on:click={onBrokenLinkClick}>
    {#if icon}<Icon {icon} size="small" />{' '}{:else}@{/if}{#if _id === contact.mention.Here}<span class="lower"
        ><Label label={contact.string.Here} /></span
      >{:else if _id === contact.mention.Everyone}<span class="lower"><Label label={contact.string.Everyone} /></span
      >{:else}{title}{/if}
  </span>
{:else if doc}
  <Component
    is={view.component.ObjectMention}
    showLoading={false}
    props={{
      object: doc,
      title,
      transparent
    }}
  />
{/if}
