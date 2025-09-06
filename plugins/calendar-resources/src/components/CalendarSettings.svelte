<script lang="ts">
  import core, { getCurrentAccount, groupByArray, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Breadcrumb, Grid, Header, Label, Scroller, Toggle } from '@hcengineering/ui'
  import calendar from '../plugin'
  import setting from '@hcengineering/setting'
  import { Calendar, ExternalCalendar, getPrimaryCalendar, PrimaryCalendar, Visibility } from '@hcengineering/calendar'
  import VisibilityEditor from './VisibilityEditor.svelte'
  import CalendarSelector from './CalendarSelector.svelte'

  const client = getClient()

  let calendars: Calendar[] = []

  const query = createQuery()
  query.query(
    calendar.class.Calendar,
    {
      user: getCurrentAccount().primarySocialId
    },
    (res) => {
      calendars = res
      calendarsLoaded = true
      setPrimaryCalendar(calendars, pref)
    }
  )

  $: categories = groupByArray(calendars, (c) => {
    return (c as ExternalCalendar).externalUser ?? 'HULY'
  })

  async function changeHidden (calendar: Calendar, value: boolean): Promise<void> {
    if (value === undefined) return
    await client.update(calendar, {
      hidden: value
    })
  }

  async function changeVisibility (calendar: Calendar, value: Visibility): Promise<void> {
    if (value === undefined) return
    await client.update(calendar, {
      visibility: value
    })
  }

  let primaryCalendar: Ref<Calendar> | undefined = undefined
  let pref: PrimaryCalendar | undefined = undefined

  let prefsLoaded = false
  let calendarsLoaded = false

  const prefQ = createQuery()
  prefQ.query(calendar.class.PrimaryCalendar, {}, (res) => {
    pref = res[0]
    prefsLoaded = true
    setPrimaryCalendar(calendars, pref)
  })

  function setPrimaryCalendar (calendars: Calendar[], pref: PrimaryCalendar | undefined): void {
    if (!prefsLoaded || !calendarsLoaded) return
    primaryCalendar = getPrimaryCalendar(calendars, pref, getCurrentAccount().uuid)
  }

  async function changePrimary (e: CustomEvent): Promise<void> {
    if (e.detail === undefined) return
    if (pref !== undefined) {
      if (pref.attachedTo === e.detail._id) return
      await client.update(pref, {
        attachedTo: e.detail._id
      })
    } else {
      await client.createDoc(calendar.class.PrimaryCalendar, core.space.Workspace, {
        attachedTo: e.detail._id
      })
    }
  }
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={calendar.icon.Calendar} label={setting.string.Settings} size={'large'} isCurrent />
  </Header>
  <div class="hulyComponent-content__column content">
    <Scroller align={'center'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
      <div class="hulyComponent-content">
        <div class="flex-col-center">
          <div class="flex-row-center flex-gap-2 mb-8 fs-title">
            <Label label={calendar.string.PrimaryCalendar} />
            <CalendarSelector value={primaryCalendar} on:change={changePrimary} withIcon={false} />
          </div>
        </div>
        <div class="flex-col=">
          <Grid column={3} columnGap={3} rowGap={1}>
            <div>
              <Label label={calendar.string.Calendar} />
            </div>
            <div>
              <Label label={calendar.string.Visibility} />
            </div>
            <div>
              <Label label={calendar.string.Hidden} />
            </div>
            {#each categories as cat}
              <div></div>
              <div class="fs-title flex-col-center">
                {cat[0]}
              </div>
              <div></div>
              {#each cat[1] as _calendar}
                <div>{_calendar.name}</div>
                <VisibilityEditor
                  value={_calendar.visibility}
                  kind={'inline'}
                  size={'small'}
                  on:change={(res) => changeVisibility(_calendar, res.detail)}
                />
                <Toggle
                  on={_calendar.hidden}
                  disabled={_calendar._class === calendar.class.Calendar}
                  on:change={(res) => changeHidden(_calendar, res.detail)}
                />
              {/each}
            {/each}
          </Grid>
        </div>
      </div>
    </Scroller>
  </div>
</div>
