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
  import type { Class, Doc, Ref, Space } from '@hcengineering/core'
  import { AccountRole, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Label, Section, Scroller } from '@hcengineering/ui'
  import { Table, ViewletsSettingButton } from '@hcengineering/view-resources'
  import { Viewlet, ViewletPreference } from '@hcengineering/view'

  import love from '../plugin'

  export let objectId: Ref<Doc>
  export let space: Ref<Space>
  export let _class: Ref<Class<Doc>>
  export let readonly: boolean = false
  export let meetings: number | undefined = undefined

  const me = getCurrentAccount()

  let viewlet: Viewlet | undefined
  let preference: ViewletPreference | undefined
  let loading = true

  let canViewMinutes: boolean = false
  $: canViewMinutes = hasAccountRole(me, AccountRole.User)

  // Meeting minutes are not created as collection items, so the `meetings` counter of the
  // room is not maintained; count the attached minutes instead.
  const minutesQuery = createQuery()
  let total: number | undefined = undefined
  $: if (canViewMinutes) {
    total = undefined
    minutesQuery.query(
      love.class.MeetingMinutes,
      { attachedTo: objectId },
      (res) => {
        total = res.total
      },
      { limit: 1, total: true }
    )
  }
  $: count = total ?? meetings ?? 0
</script>

{#if canViewMinutes}
  <Section label={love.string.MeetingMinutes} icon={love.icon.Cam}>
    <svelte:fragment slot="header">
      <ViewletsSettingButton
        viewletQuery={{ _id: love.viewlet.TableMeetingMinutesEmbedded }}
        kind={'tertiary'}
        bind:viewlet
        bind:loading
        bind:preference
      />
    </svelte:fragment>

    <svelte:fragment slot="content">
      {#if count > 0 && viewlet}
        <Scroller horizontal>
          <Table
            _class={love.class.MeetingMinutes}
            config={preference?.config ?? viewlet.config}
            query={{ attachedTo: objectId }}
            loadingProps={{ length: count }}
            prefferedSorting="createdOn"
            {readonly}
          />
        </Scroller>
      {:else}
        <div class="antiSection-empty solid flex-col mt-3">
          <span class="content-dark-color">
            <Label label={love.string.NoMeetingMinutes} />
          </span>
        </div>
      {/if}
    </svelte:fragment>
  </Section>
{/if}
