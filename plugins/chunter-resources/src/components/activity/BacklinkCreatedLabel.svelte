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
  import type { Backlink } from '@hcengineering/chunter'
  import type { Doc } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import view, { ObjectPanel } from '@hcengineering/view'
  import { DocNavLink, getDocLinkTitle } from '@hcengineering/view-resources'
  import { Label } from '@hcengineering/ui'
  import { getCurrentAccount } from '@hcengineering/core'
  import { PersonAccount } from '@hcengineering/contact'

  import chunter from '../../plugin'
  import BacklinkReference from '../BacklinkReference.svelte'

  export let value: Backlink | undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const currentAccount = getCurrentAccount() as PersonAccount

  let docPanel: ObjectPanel | undefined
  let targetPanel: ObjectPanel | undefined

  let targetTitle: string | undefined = undefined

  const docQuery = createQuery()
  const targetQuery = createQuery()

  let doc: Doc | undefined
  let target: Doc | undefined

  $: value?.attachedToClass &&
    getDocLinkTitle(client, value.attachedTo, value.attachedToClass, target).then((res) => {
      targetTitle = res
    })

  $: value !== undefined &&
    docQuery.query(value.backlinkClass, { _id: value.backlinkId }, (r) => {
      doc = r.shift()
    })

  $: value?.attachedToClass &&
    targetQuery.query(value.attachedToClass, { _id: value.attachedTo }, (r) => {
      target = r.shift()
    })

  $: targetPanel =
    value?.attachedToClass && hierarchy.classHierarchyMixin(value.attachedToClass, view.mixin.ObjectPanel)
  $: docPanel = value?.backlinkClass && hierarchy.classHierarchyMixin(value.backlinkClass, view.mixin.ObjectPanel)
</script>

<span class="text-sm lower">
  <Label label={chunter.string.Mentioned} />
</span>
{#if target}
  <DocNavLink object={target} component={targetPanel?.component ?? view.component.EditDoc} shrink={0}>
    <span class="text-sm">
      {#if currentAccount.person === target._id}
        <Label label={chunter.string.You} />
      {:else}
        {targetTitle}
      {/if}
    </span>
  </DocNavLink>
{/if}
{#if doc && value}
  <span class="text-sm lower"><Label label={chunter.string.In} /></span>
  <DocNavLink object={doc} component={docPanel?.component ?? view.component.EditDoc} shrink={0}>
    <span class="text-sm"
      ><BacklinkReference {value} inline={hierarchy.isDerived(doc._class, chunter.class.ChatMessage)} /></span
    >
  </DocNavLink>
{/if}

<style lang="scss">
  span {
    margin-left: 0.25rem;
    font-weight: 400;
    line-height: 1.25rem;
  }
</style>
