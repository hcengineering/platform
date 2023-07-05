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
  import { Ref, WithLookup } from '@hcengineering/core'
  import { Department, Staff } from '@hcengineering/hr'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { UsersPopup } from '@hcengineering/contact-resources'
  import { Button, eventToHTMLElement, IconAdd, Label, Scroller, showPopup } from '@hcengineering/ui'
  import view, { Viewlet, ViewletPreference } from '@hcengineering/view'
  import {
    getViewOptions,
    setActiveViewletId,
    viewOptionStore,
    Table,
    ViewletSettingButton
  } from '@hcengineering/view-resources'
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
        _class: contact.class.Employee,
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

  const preferenceQuery = createQuery()
  let preference: ViewletPreference | undefined
  let loading = false
  let descr: WithLookup<Viewlet> | undefined

  $: updateDescriptor(hr.viewlet.TableMember)

  function updateDescriptor (id: Ref<Viewlet>) {
    loading = true
    client
      .findOne<Viewlet>(view.class.Viewlet, {
        _id: id
      })
      .then((res) => {
        descr = res
        if (res !== undefined) {
          setActiveViewletId(res._id)
          preferenceQuery.query(
            view.class.ViewletPreference,
            {
              attachedTo: res._id
            },
            (res) => {
              preference = res[0]
              loading = false
            },
            { limit: 1 }
          )
        }
      })
  }

  $: viewOptions = getViewOptions(descr, $viewOptionStore)
</script>

<div class="antiSection">
  <div class="antiSection-header">
    <span class="antiSection-header__title">
      <Label label={hr.string.Members} />
    </span>
    <div class="flex-row-center gap-2 reverse">
      <ViewletSettingButton bind:viewOptions viewlet={descr} kind={'ghost'} />
      <Button id={hr.string.AddEmployee} icon={IconAdd} kind={'ghost'} on:click={add} />
    </div>
  </div>
  {#if (value?.members.length ?? 0) > 0}
    <Scroller>
      <Table
        _class={hr.mixin.Staff}
        config={preference?.config ?? descr?.config ?? []}
        options={descr?.options}
        query={{ department: objectId }}
        loadingProps={{ length: value?.members.length ?? 0 }}
      />
    </Scroller>
  {:else}
    <div class="antiSection-empty solid flex-col-center mt-3">
      <span class="text-sm content-dark-color">
        <Label label={hr.string.NoMembers} />
      </span>
      <span class="text-sm content-color over-underline" on:click={add}>
        <Label label={hr.string.AddMember} />
      </span>
    </div>
  {/if}
</div>
