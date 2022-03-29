<!--
//
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
//
-->
<script lang="ts">
  import calendar from '@anticrm/calendar'
  import contact, { Employee, EmployeeAccount } from '@anticrm/contact'
  import { Client, getCurrentAccount, Ref } from '@anticrm/core'
  import login from '@anticrm/login'
  import notification, { NotificationStatus } from '@anticrm/notification'
  import { NotificationClientImpl } from '@anticrm/notification-resources'
  import { Avatar, createQuery, setClient } from '@anticrm/presentation'
  import { Team } from '@anticrm/spuristo'
  import ui, {
    ActionIcon, Button, closePopup,
    closeTooltip,
    Component,
    fetchMetadataLocalStorage,
    getCurrentLocation,
    IconEdit,
    IconSearch,
    location,
    navigate,
    Popup,
    showPopup,
    TooltipInstance
  } from '@anticrm/ui'
  import { onDestroy } from 'svelte'
  import spuristo from '../plugin'
  import { NavigationItem, Selection } from '../utils'
  import AccountPopup from './AccountPopup.svelte'
  import AppItem from './AppItem.svelte'
  import CreateIssue from './CreateIssue.svelte'
  import Navigator from './Navigator.svelte'

  export let client: Client

  setClient(client)
  NotificationClientImpl.getClient()

  let selection: Selection = {}
  let specialComponent: NavigationItem | undefined

  let teamInstance: Team | undefined

  const lquery = createQuery()
  $: lquery.query(spuristo.class.Team, { _id: selection.currentTeam }, (result) => {
    teamInstance = result.shift()
  })

  const specials: NavigationItem[] = [
    {
      id: 'inbox',
      top: true,
      label: spuristo.string.Inbox,
      icon: spuristo.icon.SpuristoApplication,
      component: spuristo.component.Inbox
    },
    {
      id: 'my-issues',
      top: true,
      label: spuristo.string.MyIssues,
      icon: spuristo.icon.SpuristoApplication,
      component: spuristo.component.MyIssues
    },
    {
      id: 'views',
      top: true,
      label: spuristo.string.Views,
      icon: spuristo.icon.SpuristoApplication,
      component: spuristo.component.Views
    },
    {
      id: 'issues',
      top: false,
      label: spuristo.string.Issues,
      icon: spuristo.icon.SpuristoApplication,
      component: spuristo.component.Issues
    },
    {
      id: 'active',
      top: false,
      label: spuristo.string.Active,
      icon: spuristo.icon.SpuristoApplication,
      component: spuristo.component.Active
    },
    {
      id: 'backlog',
      top: false,
      label: spuristo.string.Backlog,
      icon: spuristo.icon.SpuristoApplication,
      component: spuristo.component.Backlog
    },
    {
      id: 'board',
      top: false,
      label: spuristo.string.Board,
      icon: spuristo.icon.SpuristoApplication,
      component: spuristo.component.Board
    },
    {
      id: 'projects',
      top: false,
      label: spuristo.string.Projects,
      icon: spuristo.icon.SpuristoApplication,
      component: spuristo.component.Projects
    }
  ]

  onDestroy(
    location.subscribe(async (loc) => {
      closeTooltip()
      closePopup()
      updateTeam(loc.path[1], loc.path[2] as Ref<Team>)
    })
  )

  $: if (selection.currentSpecial !== undefined) {
    specialComponent = getSpecialComponent(selection.currentSpecial)
  }

  async function updateTeam (specialId?: string, teamId?: Ref<Team>): Promise<void> {
    if (specialId === undefined) {
      // Select first top special
      specialId = specials
        .filter((it) => it.top)
        .map((it) => it.id)
        .shift() as string
    }

    const loc = getCurrentLocation()

    let change = 0
    if (loc.path[1] !== specialId) {
      loc.path[1] = specialId as string
      change++
    }
    loc.path.length = 3
    if (loc.path[2] !== teamId) {
      if (teamId !== undefined) {
        loc.path[2] = teamId
      } else {
        loc.path.length = 2
      }
      change++
    }
    selection = { currentSpecial: specialId, currentTeam: teamId }
    if (change > 0) {
      navigate(loc)
    }
  }

  function getSpecialComponent (id: string): NavigationItem | undefined {
    return specials.find((x) => x.id === id)
  }

  const account = getCurrentAccount() as EmployeeAccount
  let employee: Employee | undefined
  const employeeQ = createQuery()

  employeeQ.query(
    contact.class.Employee,
    {
      _id: account.employee
    },
    (res) => {
      employee = res[0]
    },
    { limit: 1 }
  )

  let hasNotification = false
  const notificationQuery = createQuery()

  $: notificationQuery.query(
    notification.class.Notification,
    {
      attachedTo: account.employee,
      status: NotificationStatus.New
    },
    (res) => {
      hasNotification = res.length > 0
    },
    {
      limit: 1
    }
  )
  async function newIssue (target: EventTarget | null): Promise<void> {
    showPopup(CreateIssue, { space: teamInstance?._id }, target as HTMLElement)
  }
</script>

{#if client}
  <svg class="svg-mask">
    <clipPath id="notify-normal">
      <path
        d="M0,0v52.5h52.5V0H0z M34,23.2c-3.2,0-5.8-2.6-5.8-5.8c0-3.2,2.6-5.8,5.8-5.8c3.2,0,5.8,2.6,5.8,5.8 C39.8,20.7,37.2,23.2,34,23.2z"
      />
    </clipPath>
    <clipPath id="notify-small">
      <path d="M0,0v45h45V0H0z M29.5,20c-2.8,0-5-2.2-5-5s2.2-5,5-5s5,2.2,5,5S32.3,20,29.5,20z" />
    </clipPath>
  </svg>
  <div class="workbench-container">
    <div class="antiPanel-navigator filled indent">
      <div class="flex flex-grow flex-between ml-4 mr-4 mt-2">
          <div>
            {fetchMetadataLocalStorage(login.metadata.CurrentWorkspace)}
          </div>
          <div
            id="profile-button"
            class="cursor-pointer"
            on:click|stopPropagation={(el) => {
              showPopup(AccountPopup, {}, el.currentTarget)
            }}
          >
            {#if employee}
              <Avatar avatar={employee.avatar} size={'medium'} />
            {/if}
          </div>
      </div>
      <div class='flex-center ml-2 mr-2 mt-4 mb-4'>
        <div class='flex-grow'>
          <Button icon={IconEdit} label={spuristo.string.NewIssue} width={'100%'} size={'small'} 
          on:click={(evt) => newIssue(evt.currentTarget)} />
        </div>
        <div class='ml-2'>
          <ActionIcon icon={IconSearch} label={ui.string.Search} action={async () => {}} size={'large'} />
        </div>
      </div>
      <Navigator
        {selection}
        {specials}
        on:selection={(evt) => updateTeam(evt.detail.currentSpecial, evt.detail.currentTeam)}
      />
      <div class='flex'>
        <AppItem
        icon={calendar.icon.Reminder}
        label={calendar.string.Reminders}
        selected={false}
        action={async () => {
          showPopup(calendar.component.RemindersPopup, {}, 'account')
        }}
        notify={false}
      />
      <AppItem
        icon={notification.icon.Notifications}
        label={notification.string.Notifications}
        selected={false}
        action={async () => {
          showPopup(notification.component.NotificationsPopup, {}, 'account')
        }}
        notify={hasNotification}
      />
      </div>
    </div>
    <div class="antiPanel-component indent antiComponent content" class:filled={true}>
      {#if specialComponent && teamInstance}
        <Component
          is={specialComponent.component}
          props={{ ...specialComponent.componentProps, currentTeam: teamInstance }}
        />
      {/if}
    </div>
    <!-- <div class="aside"><Chat thread/></div> -->
  </div>
  <Popup />
  <TooltipInstance />
{:else}
  No client
{/if}

<style lang="scss">
  .workbench-container {
    display: flex;
    height: 100%;
    padding-bottom: 1.25rem;
  }
  .content {
    padding: 1rem;
  }
</style>
