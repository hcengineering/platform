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
  import activity, { ActivityReference } from '@hcengineering/activity'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Action, Label, ShowMore } from '@hcengineering/ui'
  import { personAccountByIdStore, personByIdStore } from '@hcengineering/contact-resources'
  import { Account, Doc, Ref, getCurrentAccount } from '@hcengineering/core'
  import { Person, type PersonAccount } from '@hcengineering/contact'
  import view, { ObjectPanel } from '@hcengineering/view'
  import { DocNavLink, getDocLinkTitle } from '@hcengineering/view-resources'

  import ReferenceContent from './ReferenceContent.svelte'
  import ReferenceSrcPresenter from './ReferenceSrcPresenter.svelte'

  import ActivityMessageTemplate from '../activity-message/ActivityMessageTemplate.svelte'

  export let value: ActivityReference
  export let showNotify: boolean = false
  export let isHighlighted: boolean = false
  export let isSelected: boolean = false
  export let shouldScroll: boolean = false
  export let embedded: boolean = false
  export let withActions: boolean = true
  export let showEmbedded = false
  export let hideFooter = false
  export let actions: Action[] = []
  export let skipLabel = false
  export let hoverable = true
  export let hoverStyles: 'borderedHover' | 'filledHover' = 'borderedHover'
  export let hideLink = false
  export let compact = false
  export let onClick: (() => void) | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const currentAccount = getCurrentAccount() as PersonAccount

  const srcDocQuery = createQuery()
  const targetDocQuery = createQuery()

  let srcDoc: Doc | undefined = undefined
  let targetDoc: Doc | undefined = undefined

  let srcDocPanel: ObjectPanel | undefined
  let targetPanel: ObjectPanel | undefined

  let targetTitle: string | undefined = undefined

  let person: Person | undefined = undefined

  $: person = getPerson(value.createdBy ?? value.modifiedBy, $personAccountByIdStore, $personByIdStore)

  $: srcDocQuery.query(value.srcDocClass, { _id: value.srcDocId }, (result) => {
    srcDoc = result.shift()
  })

  $: targetDocQuery.query(value.attachedToClass, { _id: value.attachedTo }, (r) => {
    targetDoc = r.shift()
  })

  $: targetPanel = hierarchy.classHierarchyMixin(value.attachedToClass, view.mixin.ObjectPanel)
  $: srcDocPanel = hierarchy.classHierarchyMixin(value.srcDocClass, view.mixin.ObjectPanel)

  $: targetDoc !== undefined &&
    getDocLinkTitle(client, targetDoc._id, targetDoc._class, targetDoc).then((res) => {
      targetTitle = res
    })

  function getPerson (
    _id: Ref<Account>,
    accountById: Map<Ref<PersonAccount>, PersonAccount>,
    personById: Map<Ref<Person>, Person>
  ): Person | undefined {
    const personAccount = accountById.get(_id as Ref<PersonAccount>)

    if (personAccount === undefined) {
      return undefined
    }

    return personById.get(personAccount.person)
  }
</script>

<ActivityMessageTemplate
  message={value}
  {person}
  {showNotify}
  {isHighlighted}
  {isSelected}
  {shouldScroll}
  {embedded}
  {withActions}
  {showEmbedded}
  {hideFooter}
  {actions}
  {skipLabel}
  {hoverable}
  {hoverStyles}
  showDatePreposition
  {onClick}
>
  <svelte:fragment slot="header">
    <span class="header">
      <span class="text-sm lower ml-1">
        <Label label={activity.string.Mentioned} />
      </span>
      {#if !hideLink && targetDoc}
        <DocNavLink object={targetDoc} component={targetPanel?.component ?? view.component.EditDoc} shrink={0}>
          <span class="text-sm">
            {#if currentAccount.person === targetDoc._id}
              <Label label={activity.string.You} />
            {:else}
              {targetTitle}
            {/if}
          </span>
        </DocNavLink>
      {/if}
      {#if srcDoc}
        <span class="text-sm lower"><Label label={activity.string.In} /></span>
        <DocNavLink object={srcDoc} component={srcDocPanel?.component ?? view.component.EditDoc} shrink={0} noUnderline>
          <ReferenceSrcPresenter value={srcDoc} />
        </DocNavLink>
      {/if}
    </span>
  </svelte:fragment>
  <svelte:fragment slot="content">
    <ShowMore limit={compact ? 80 : undefined}>
      <ReferenceContent {value} />
    </ShowMore>
  </svelte:fragment>
</ActivityMessageTemplate>

<style lang="scss">
  .header {
    display: flex;
    align-items: center;
    gap: var(--spacing-0_5);
  }
</style>
