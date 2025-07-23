<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import contact, { Employee } from '@hcengineering/contact'
  import { UsersPopup } from '@hcengineering/contact-resources'
  import type { Ref } from '@hcengineering/core'
  import { type Department } from '@hcengineering/hr'
  import { getClient } from '@hcengineering/presentation'
  import { Button, IconAdd, Label, Section, showPopup, Scroller } from '@hcengineering/ui'
  import { Viewlet, ViewletPreference } from '@hcengineering/view'
  import { Table, ViewletSelector, ViewletSettingButton } from '@hcengineering/view-resources'
  import hr from '../plugin'

  export let department: Department
  export let members: Array<Ref<Employee>>
  export let readonly: boolean = false

  const client = getClient()
  let loading = true

  const createApp = async (ev: MouseEvent): Promise<void> => {
    if (readonly) {
      return
    }

    showPopup(
      UsersPopup,
      {
        _class: contact.mixin.Employee,
        ignoreUsers: members,
        icon: contact.icon.Person,
        allowDeselect: false,
        placeholder: hr.string.Members
      },
      ev.target as HTMLElement,
      async (result) => {
        if (result != null) {
          const selected: Employee[] = Array.isArray(result) ? result : [result]
          for (const member of selected) {
            await client.updateMixin(member._id, member._class, member.space, hr.mixin.Staff, {
              department: department._id
            })
          }
        }
      }
    )
  }

  let viewlet: Viewlet | undefined
  let preference: ViewletPreference | undefined
</script>

<Section id="members" label={hr.string.Members} icon={hr.icon.Members}>
  <svelte:fragment slot="header">
    <div class="buttons-group xsmall-gap">
      <ViewletSelector
        hidden
        bind:viewlet
        bind:preference
        bind:loading
        viewletQuery={{ _id: hr.viewlet.TableMember }}
      />
      <ViewletSettingButton kind={'tertiary'} bind:viewlet />
      {#if !readonly}
        <Button id={hr.string.AddMember} icon={IconAdd} kind={'ghost'} on:click={createApp} />
      {/if}
    </div>
  </svelte:fragment>

  <svelte:fragment slot="content">
    {#if members.length > 0 && viewlet}
      <Scroller horizontal noFade={false}>
        <Table
          _class={contact.mixin.Employee}
          config={preference?.config ?? viewlet.config}
          options={viewlet.options}
          query={{ _id: { $in: members } }}
          loadingProps={{ length: members.length }}
          {readonly}
        />
      </Scroller>
    {:else}
      <div class="antiSection-empty solid flex-col mt-3">
        <span class="content-dark-color">
          <Label label={hr.string.NoMembers} />
        </span>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        {#if !readonly}
          <span class="over-underline content-color" on:click={createApp}>
            <Label label={hr.string.AddMember} />
          </span>
        {/if}
      </div>
    {/if}
  </svelte:fragment>
</Section>
