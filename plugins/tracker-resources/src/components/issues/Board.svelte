<script lang="ts">
  import contact from '@anticrm/contact'
  import { Class, Doc, FindOptions, Ref, WithLookup } from '@anticrm/core'
  import { Kanban } from '@anticrm/kanban'
  import { createQuery } from '@anticrm/presentation'
  import { Issue, IssueStatus, Team } from '@anticrm/tracker'
  import { Button, Component, eventToHTMLElement, Icon, IconAdd, IconMoreH, showPopup, Tooltip } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { focusStore, ListSelectionProvider, selectionStore } from '@anticrm/view-resources'
  import ActionContext from '@anticrm/view-resources/src/components/ActionContext.svelte'
  import Menu from '@anticrm/view-resources/src/components/Menu.svelte'
  import { onMount } from 'svelte'
  import tracker from '../../plugin'
  import CreateIssue from '../CreateIssue.svelte'
import AssigneePresenter from './AssigneePresenter.svelte';
  import IssuePresenter from './IssuePresenter.svelte'
import PriorityPresenter from './PriorityPresenter.svelte';

  export let currentSpace: Ref<Team>
  export let baseMenuClass: Ref<Class<Doc>> | undefined = undefined

  const states = [
    {
      _id: IssueStatus.Backlog,
      title: 'Backlog',
      color: 0,
      icon: tracker.icon.StatusBacklog
    },
    {
      _id: IssueStatus.InProgress,
      title: 'In progress',
      color: 1,
      icon: tracker.icon.StatusInProgress
    },
    {
      _id: IssueStatus.Todo,
      title: 'To do',
      color: 2,
      icon: tracker.icon.StatusTodo
    },
    {
      _id: IssueStatus.Done,
      title: 'Done',
      color: 3,
      icon: tracker.icon.StatusDone
    },
    {
      _id: IssueStatus.Canceled,
      title: 'Canceled',
      color: 4,
      icon: tracker.icon.StatusCanceled
    }
  ]
  /* eslint-disable no-undef */

  const spaceQuery = createQuery()

  let currentTeam: Team | undefined

  $: spaceQuery.query(tracker.class.Team, { _id: currentSpace }, (res) => {
    currentTeam = res.shift()
  })
  /* eslint-disable prefer-const */
  /* eslint-disable no-unused-vars */
  let issue: Issue

  function toIssue (object: any): WithLookup<Issue> {
    return object as WithLookup<Issue>
  }

  const options: FindOptions<Issue> = {
    lookup: {
      assignee: contact.class.Employee
    }
  }

  let kanbanUI: Kanban
  const listProvider = new ListSelectionProvider(
    (pos, dir) => {
      if (dir === 'vertical') {
        // Select next
        kanbanUI.selectStatePosition(pos, 'down')
      } else {
        kanbanUI.selectStatePosition(pos, 'right')
      }
    },
    (pos, dir) => {
      // Select prev
      if (dir === 'vertical') {
        kanbanUI.selectStatePosition(pos, 'up')
      } else {
        kanbanUI.selectStatePosition(pos, 'left')
      }
    }
  )
  onMount(() => {
    (document.activeElement as HTMLElement)?.blur()
  })

  const showMenu = async (ev: MouseEvent, items: Doc[]): Promise<void> => {
    ev.preventDefault()
    showPopup(Menu, { object: items, baseMenuClass }, {
      getBoundingClientRect: () => DOMRect.fromRect({ width: 1, height: 1, x: ev.clientX, y: ev.clientY })
    }, () => {
      // selection = undefined
    })
  }
</script>

{#if currentTeam}
  <ActionContext
    context={{
      mode: 'browser'
    }}
  />
  <div class="flex-between label font-medium w-full p-4">
    Board
  </div>
  <Kanban
    bind:this={kanbanUI}
    _class={tracker.class.Issue}
    space={currentSpace}
    search=""
    {states}
    {options}
    query={{}}
    fieldName={'status'}
    rankFieldName={'rank'}
    on:content={(evt) => {
      listProvider.update(evt.detail)
    }}
    on:obj-focus={(evt) => {
      listProvider.updateFocus(evt.detail)
    }}
    selection={listProvider.current($focusStore)}

    checked={$selectionStore ?? []}
    on:check={(evt) => {
      listProvider.updateSelection(evt.detail.docs, evt.detail.value)
    }}
    on:contextmenu={(evt) => showMenu(evt.detail.evt, evt.detail.objects)}
  >
    <svelte:fragment slot="header" let:state let:count>
      <div class="header flex-col">        
        <div class="flex-between label font-medium w-full h-full mb-4">
          <div class="flex-row-center gap-2">
            <Icon icon={state.icon} size={'small'} />
            <span class="lines-limit-2 ml-2">{state.title}</span>
            <span class="counter ml-2 text-md">{count}</span>
          </div>
          <div class="flex gap-1">
            <Tooltip label={tracker.string.AddIssueTooltip} direction={'left'}>
              <Button
                icon={IconAdd}
                kind={'transparent'}
                on:click={(evt) => {
                  showPopup(CreateIssue, { space: currentSpace, issueStatus: state._id }, eventToHTMLElement(evt))
                }}
              />
            </Tooltip>
          </div>
        </div>
      </div>
    </svelte:fragment>
    <svelte:fragment slot="card" let:object>
      {@const issue = toIssue(object)}
      <div class="flex-row pt-2 pb-2 pr-4 pl-4">
        <div class="flex-between mb-2">
          <IssuePresenter value={object} {currentTeam} />
          {#if issue.$lookup?.assignee}
          <AssigneePresenter value={issue} {currentSpace} isEditable={true}/>
          {/if}
        </div>
        <span class="fs-bold title">
          {object.title}
        </span>
        <div class='flex gap-2 mt-2 mb-2'>
          <PriorityPresenter value={issue} {currentSpace} isEditable={true}/>
        </div>
      </div>
    </svelte:fragment>
  </Kanban>
{/if}

<style lang="scss">
  .header {
    height: 6rem;
    min-height: 6rem;
    user-select: none;

    .filter {
      border-bottom: 1px solid var(--divider-color);
    }

    .label {
      color: var(--theme-caption-color);
      border-bottom: 1px solid var(--divider-color);
      .counter {
        color: rgba(var(--theme-caption-color), 0.8);
      }
    }
  }
  .title {
    color: var(--theme-caption-color);
  }
</style>
