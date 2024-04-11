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
  import { ActivityInfoMessage } from '@hcengineering/activity'
  import { Employee, PersonAccount } from '@hcengineering/contact'
  import {
    Avatar,
    SystemAvatar,
    employeeByIdStore,
    personAccountByIdStore,
    personByIdStore
  } from '@hcengineering/contact-resources'
  import { Action } from '@hcengineering/ui'
  import { Ref } from '@hcengineering/core'
  import { translate } from '@hcengineering/platform'
  import { HTMLViewer } from '@hcengineering/presentation'

  import ActivityMessageTemplate from '../activity-message/ActivityMessageTemplate.svelte'
  import ActivityMessageHeader from '../activity-message/ActivityMessageHeader.svelte'

  export let value: ActivityInfoMessage
  export let showNotify: boolean = false
  export let isHighlighted: boolean = false
  export let isSelected: boolean = false
  export let shouldScroll: boolean = false
  export let embedded: boolean = false
  export let withActions: boolean = true
  export let actions: Action[] = []
  export let hoverable = true
  export let hoverStyles: 'borderedHover' | 'filledHover' = 'borderedHover'
  export let hideLink = false
  export let onClick: (() => void) | undefined = undefined

  $: personAccount = $personAccountByIdStore.get((value.createdBy ?? value.modifiedBy) as Ref<PersonAccount>)
  $: person =
    personAccount?.person !== undefined
      ? $employeeByIdStore.get(personAccount.person as Ref<Employee>) ?? $personByIdStore.get(personAccount.person)
      : undefined

  let content = ''

  $: void translate(value.message, value.props)
    .then((message) => {
      content = message
    })
    .catch((err) => {
      content = JSON.stringify(err, null, 2)
    })
</script>

<ActivityMessageTemplate
  message={value}
  parentMessage={undefined}
  {person}
  {showNotify}
  {isHighlighted}
  {isSelected}
  {shouldScroll}
  {embedded}
  {withActions}
  {actions}
  {hoverable}
  {hoverStyles}
  viewlet={undefined}
  {onClick}
>
  <svelte:fragment slot="icon">
    {#if value.icon}
      <SystemAvatar size="medium" icon={value.icon} iconProps={value.iconProps} />
    {:else if person}
      <Avatar size="medium" avatar={person.avatar} name={person.name} />
    {:else}
      <SystemAvatar size="medium" />
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="header">
    <ActivityMessageHeader
      message={value}
      {person}
      object={undefined}
      parentObject={undefined}
      isEdited={false}
      {hideLink}
      label={value.title}
    />
  </svelte:fragment>
  <svelte:fragment slot="content">
    <div class="flex-row-center">
      <div class="customContent">
        <HTMLViewer value={content} />
      </div>
    </div>
  </svelte:fragment>
</ActivityMessageTemplate>

<style lang="scss">
  .customContent {
    display: flex;
    flex-wrap: wrap;
    column-gap: 0.625rem;
    row-gap: 0.625rem;
  }
</style>
