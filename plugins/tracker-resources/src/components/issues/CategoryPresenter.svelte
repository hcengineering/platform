<script lang="ts">
  import { DocumentQuery, FindOptions } from '@anticrm/core'
  import { Issue, IssueStatus, Team } from '@anticrm/tracker'
  import { Scroller } from '@anticrm/ui'
  import { Table } from '@anticrm/view-resources'
  import tracker from '../../plugin'
  import contact from '@anticrm/contact'

  export let query: DocumentQuery<Issue>
  export let category: IssueStatus
  export let currentTeam: Team

  const options: FindOptions<Issue> = {
    lookup: {
      assignee: contact.class.Employee
    }
  }

  let visible = false
</script>

<div class='category' class:visible={visible}>
  <div class='fs-title'>
    {IssueStatus[category]}
  </div>
<Scroller>
  <Table
    _class={tracker.class.Issue}
    config={[
      { key: '', presenter: tracker.component.IssuePresenter, props: { currentTeam }, label: tracker.string.Issue },
      'title',
      // 'status',
      '$lookup.assignee',
      'modifiedOn'
    ]}
    options={options}
    query={{ ...query, status: category }}
    showNotification
    highlightRows
    on:content={(evt) => { visible = evt.detail.length > 0 }}
  />
</Scroller>
</div>

<style lang="scss">
  .category {
    display: none;
    &.visible { 
      display: block; 
    }
  }
</style>
