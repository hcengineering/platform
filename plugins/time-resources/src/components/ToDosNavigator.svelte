<script lang="ts">
  import { getCurrentEmployee } from '@hcengineering/contact'
  import { Ref, getCurrentAccount } from '@hcengineering/core'
  import { Asset, IntlString } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { NavFooter } from '@hcengineering/workbench-resources'
  import tagsPlugin, { TagElement as TagElementType } from '@hcengineering/tags'
  import ui, {
    Label,
    Separator,
    NavItem,
    NavGroup,
    Scroller,
    Month,
    getPlatformColorDef,
    themeStore,
    deviceOptionsStore as deviceInfo
  } from '@hcengineering/ui'
  import { ToDosMode } from '..'
  import time from '../plugin'

  export let mode: ToDosMode
  export let tag: Ref<TagElementType> | undefined
  export let currentDate: Date

  const currentAccount = getCurrentAccount()
  const currentUser = getCurrentEmployee()

  interface IMode {
    label: IntlString
    value: ToDosMode
    icon: Asset
  }

  const modes: IMode[] = [
    {
      label: time.string.Unplanned,
      value: 'unplanned',
      icon: time.icon.Inbox
    },
    {
      label: time.string.Planned,
      value: 'planned',
      icon: time.icon.Planned
    },
    {
      label: time.string.All,
      value: 'all',
      icon: time.icon.All
    }
  ]

  let allTags: TagElementType[] = []
  let tags: TagElementType[] = []
  let myTags = new Set<Ref<TagElementType>>()
  const tagsQuery = createQuery()
  const myTagsQuery = createQuery()

  tagsQuery.query(
    tagsPlugin.class.TagElement,
    {
      category: time.category.Other,
      refCount: { $gt: 0 },
      targetClass: { $in: [time.class.ToDo, time.class.ProjectToDo] }
    },
    (result) => {
      allTags = result
    }
  )

  $: myTagsQuery.query(
    tagsPlugin.class.TagReference,
    {
      createdBy: currentAccount.primarySocialId,
      tag: { $in: allTags.map((p) => p._id) }
    },
    (result) => {
      myTags = new Set(result.map((p) => p.tag))
    }
  )

  $: tags = allTags.filter((p) => myTags.has(p._id))

  const unplannedQuery = createQuery()

  unplannedQuery.query(
    time.class.ToDo,
    {
      user: currentUser,
      doneOn: null,
      workslots: 0
    },
    (res) => {
      counters.unplanned = res.total
    },
    {
      total: true,
      limit: 1
    }
  )

  const counters: Record<string, number> = {}
  const today: Date = new Date()
</script>

<div
  class="antiPanel-navigator {$deviceInfo.navigator.direction === 'horizontal' ? 'portrait' : 'landscape'} border-left"
  class:fly={$deviceInfo.navigator.float}
>
  <div class="antiPanel-wrap__content hulyNavPanel-container">
    <div class="hulyNavPanel-header">
      <Label label={time.string.Planner} />
    </div>

    <Scroller shrink>
      {#each modes as _mode}
        {@const counter = counters[_mode.value] ?? 0}
        <NavItem
          icon={_mode.icon}
          label={_mode.label}
          selected={mode === _mode.value}
          count={counter > 0 ? counter : null}
          on:click={() => {
            mode = _mode.value
            tag = undefined
            localStorage.setItem('todos_last_mode', mode)
            localStorage.removeItem('todos_last_tag')
          }}
        />
      {/each}
      <div class="min-h-3 flex-no-shrink" />

      <div class="hulyAccordionItem-container border" class:noBorder={tags.length === 0}>
        <Month
          currentDate={mode === 'date' ? currentDate : null}
          on:update={(event) => {
            if (event.detail) {
              tag = undefined
              currentDate = event.detail
              mode = 'date'
              localStorage.setItem('todos_last_mode', mode)
              localStorage.removeItem('todos_last_tag')
            }
          }}
        >
          <svelte:fragment slot="header">
            <div class="flex-col mx-2 gapV-1 flex-no-shrink flex-grow">
              <div class="calendar-slot-row">
                <div class="dot red" />
                <span class="overflow-label upperFirstLetter"><Label label={ui.string.DueDate} /></span>
              </div>
              <div class="calendar-slot-row">
                <div class="dot blue" />
                <span class="overflow-label upperFirstLetter"><Label label={time.string.Scheduled} /></span>
              </div>
            </div>
          </svelte:fragment>
          <svelte:fragment let:day>
            <!-- {#if areDatesEqual(day.date, today)}
              <div class="dots">
                <div class="dot red" />
                <div class="dot blue" />
              </div>
            {/if} -->
          </svelte:fragment>
        </Month>
      </div>

      {#if tags.length > 0}
        <NavGroup
          _id={'planner-tags'}
          label={tagsPlugin.string.Tags}
          highlighted={mode === 'tag'}
          categoryName={'tags'}
          noDivider
          isFold
          visible={tag !== undefined}
        >
          {#each tags as _tag}
            {@const color = getPlatformColorDef(_tag.color ?? 0, $themeStore.dark)}
            <NavItem
              color={color.color}
              title={_tag.title}
              selected={tag === _tag._id}
              type={'type-tag'}
              on:click={() => {
                mode = 'tag'
                tag = _tag._id
                localStorage.setItem('todos_last_mode', mode)
                localStorage.setItem('todos_last_tag', tag)
              }}
            />
          {/each}
          <svelte:fragment slot="visible" let:isOpen>
            {#if !isOpen}
              {@const visibleTag = tags.find((t) => t._id === tag)}
              {#if visibleTag}
                {@const color = getPlatformColorDef(visibleTag.color ?? 0, $themeStore.dark)}
                <NavItem color={color.color} title={visibleTag.title} selected type={'type-tag'} />
              {/if}
            {/if}
          </svelte:fragment>
        </NavGroup>
      {/if}
    </Scroller>
    <NavFooter />
  </div>
  <Separator
    name={'time'}
    float={$deviceInfo.navigator.float ? 'navigator' : true}
    index={0}
    disabledWhen={['panel-aside']}
    color={'var(--theme-divider-color)'}
  />
</div>

<style lang="scss">
  .calendar-slot-row {
    display: flex;
    align-items: center;
    padding: 0 var(--spacing-0_5);
    min-width: 0;

    .dot {
      margin-right: var(--spacing-0_75);
    }
    span {
      font-weight: 400;
      font-size: 0.625rem;
      line-height: 0.5rem;
      color: var(--global-secondary-TextColor);
    }
  }
  .dot {
    flex-shrink: 0;
    width: var(--spacing-0_5);
    height: var(--spacing-0_5);
    border-radius: 50%;
    box-shadow: 0 0 0 1px var(--theme-navpanel-color);

    &.red {
      background-color: var(--global-error-TextColor);
    }
    &.blue {
      background-color: var(--global-accent-TextColor);
    }
  }
  .dots {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 1px;
    top: 0.1875rem;
    right: 0.1875rem;
  }
  .noBorder {
    border-bottom-color: transparent;
  }
</style>
