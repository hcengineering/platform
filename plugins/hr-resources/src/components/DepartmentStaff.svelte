<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import contact from '@hcengineering/contact'
  import { UsersPopup } from '@hcengineering/contact-resources'
  import { Ref, WithLookup } from '@hcengineering/core'
  import { Department, Staff } from '@hcengineering/hr'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Button, IconAdd, Label, Scroller, Section, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import { Viewlet, ViewletPreference } from '@hcengineering/view'
  import { Table, ViewletSelector, ViewletSettingButton } from '@hcengineering/view-resources'
  import hr from '../plugin'
  import { addMember } from '../utils'

  export let objectId: Ref<Department> | undefined
  let value: Department | undefined

  const departmentQuery = createQuery()
  const client = getClient()

  $: objectId &&
    value === undefined &&
    departmentQuery.query(
      hr.class.Department,
      {
        _id: objectId
      },
      (res) => ([value] = res)
    )

  function add (e: MouseEvent) {
    showPopup(
      UsersPopup,
      {
        _class: contact.mixin.Employee,
        docQuery: {
          active: true
        },
        ignoreUsers: memberItems.map((it) => it._id)
      },
      eventToHTMLElement(e),
      (res) => addMember(client, res, value)
    )
  }

  let memberItems: Staff[] = []

  const membersQuery = createQuery()
  $: membersQuery.query(hr.mixin.Staff, { department: objectId }, (result) => {
    memberItems = result
  })

  let preference: ViewletPreference | undefined
  let loading = false
  let viewlet: WithLookup<Viewlet> | undefined
</script>

<Section label={hr.string.Members}>
  <svelte:fragment slot="header">
    <div class="flex-row-center gap-2 reverse">
      <ViewletSelector
        hidden
        bind:viewlet
        bind:preference
        bind:loading
        viewletQuery={{ _id: hr.viewlet.TableMember }}
      />
      <ViewletSettingButton kind={'ghost'} bind:viewlet />
      <Button id={hr.string.AddEmployee} icon={IconAdd} kind={'ghost'} on:click={add} />
    </div>
  </svelte:fragment>

  <svelte:fragment slot="content">
    {#if (value?.members.length ?? 0) > 0}
      <Scroller>
        <Table
          _class={hr.mixin.Staff}
          config={preference?.config ?? viewlet?.config ?? []}
          options={viewlet?.options}
          query={{ department: objectId }}
          loadingProps={{ length: value?.members.length ?? 0 }}
        />
      </Scroller>
    {:else}
      <div class="antiSection-empty solid flex-col-center mt-3">
        <span class="text-sm content-dark-color">
          <Label label={hr.string.NoMembers} />
        </span>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <span class="text-sm content-color over-underline" on:click={add}>
          <Label label={hr.string.AddMember} />
        </span>
      </div>
    {/if}
  </svelte:fragment>
</Section>
