<script lang="ts">
  import { FindOptions, Ref, SortingOrder } from '@anticrm/core'
  import { Button, IconAdd, Label, showPopup } from '@anticrm/ui'
  import { Table } from '@anticrm/view-resources'
  import { Project, Team } from '@anticrm/tracker'
  import NewProject from './NewProject.svelte'
  import plugin from '../../plugin'

  export let space: Ref<Team>

  const options: FindOptions<Project> = {
    sort: {
      startDate: SortingOrder.Ascending
    }
  }

  async function showCreateDialog (ev: Event) {
    showPopup(NewProject, { space, targetElement: null }, null)
  }
</script>

<div>
  <div class="header">
    <div class="header-left">
      <Label label={plugin.string.Projects} />
    </div>
    <div class="header-right">
      <Button
        icon={IconAdd}
        label={plugin.string.Project}
        kind="secondary"
        on:click={showCreateDialog}
      />
    </div>
  </div>

  <Table
    _class={plugin.class.Project}
    config={[
      {
        key: '',
        presenter: plugin.component.ProjectPresenter,
        label: plugin.string.Project,
        sortingKey: 'name'
      }
    ]}
    query={{}}
    {options}
  />
</div>

<style>
  .header {
    width: 100%;
    height: 50px;
    display: flex;
    border-bottom: 0.5px solid #666666;
    align-items: center;
    justify-content: space-between;
  }

  .header-left {
    margin-left: 10px;
  }

  .header-right {
    margin-right: 10px;
  }
</style>
