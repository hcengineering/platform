<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Ref, Status } from '@hcengineering/core'
  import { Button, Label, SelectPopup, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import { Component, Issue, IssueStatus, Project } from '@hcengineering/tracker'
  import { statusStore } from '@hcengineering/view-resources'

  import tracker from '../../../plugin'
  import { findTargetStatus } from '../../../utils'
  import { componentStore } from '../../../component'
  import ComponentPresenter from '../../components/ComponentPresenter.svelte'
  import ComponentRefPresenter from '../../components/ComponentRefPresenter.svelte'
  import StatusRefPresenter from '../StatusRefPresenter.svelte'

  export let targetProject: Project
  export let issues: Issue[]
  export let components: Component[] = []
  export let statusToUpdate: Record<Ref<IssueStatus>, Ref<IssueStatus> | undefined>
  export let componentToUpdate: Record<Ref<Component>, Ref<Component> | undefined>

  $: if (targetProject !== undefined) {
    for (const i of issues) {
      const status = statusToUpdate[i.status]
      if (status !== undefined) {
        if ($statusStore.get(status)?.space !== targetProject._id) {
          statusToUpdate[i.status] = undefined
        }
      }
      if (statusToUpdate[i.status] === undefined) {
        const targetStatus = findTargetStatus($statusStore, i.status, targetProject._id, true)
        statusToUpdate[i.status] = targetStatus ?? targetProject.defaultIssueStatus
      }

      if (i.component !== undefined && i.component !== null) {
        const cur = components.find((it) => it._id === i.component)
        if (cur !== undefined) {
          const component = componentToUpdate[i.component]
          if (component !== undefined && components.find((it) => it._id === component)?.space !== targetProject._id) {
            componentToUpdate[cur._id] = undefined
          }
          if (component === undefined) {
            componentToUpdate[cur._id] = components.find(
              (it) => it.space === targetProject?._id && it.label === cur.label
            )?._id
          }
        }
      }
    }
  }

  $: missingComponents = (
    issues
      .filter((it) => it.component != null)
      .map((it) => components.find((cit) => cit._id === it.component)) as Component[]
  ).filter((it, idx, arr) => {
    const targetComponent = components.find((it2) => it2.space === targetProject._id && it2.label === it.label)

    return targetComponent === undefined && arr.indexOf(it) === idx
  })

  $: statusValues = $statusStore
    .filter((it) => it.space === targetProject._id)
    .map((it) => ({
      id: it._id,
      isSelected: false,
      component: StatusRefPresenter,
      props: { value: it._id, size: 'small' }
    }))

  $: componentValues = [
    { id: null, icon: tracker.icon.Components, label: tracker.string.NoComponent, isSelected: false },
    ...$componentStore
      .filter((it) => it.space === targetProject._id)
      .map((it) => ({
        id: it._id,
        isSelected: false,
        component: ComponentRefPresenter,
        props: { value: it._id }
      }))
  ]

  const getStatusRef = (status: string) => status as Ref<Status>
</script>

{#if issues[0]?.space !== targetProject._id && (Object.keys(statusToUpdate).length > 0 || missingComponents.length > 0)}
  <div class="mt-4 mb-4">
    <span class="caption-color">
      <Label label={tracker.string.SelectReplacement} />
    </span>

    <div class="mt-4">
      <div class="missing-items">
        <span class="side-columns">
          <Label label={tracker.string.MissingItem} />
        </span>
        <span class="middle-column" />
        <span class="side-columns">
          <Label label={tracker.string.Replacement} />
        </span>
      </div>
      <div class="mt-4">
        {#each Object.keys(statusToUpdate) as status}
          {@const newStatus = statusToUpdate[status]}
          <div class="missing-items mt-4">
            <div class="side-columns aligned-text">
              <StatusRefPresenter value={getStatusRef(status)} kind={'list-header'} />
            </div>
            <span class="middle-column aligned-text">-></span>
            <div class="side-columns">
              <Button
                on:click={(event) => {
                  showPopup(
                    SelectPopup,
                    { value: statusValues, searchable: true },
                    eventToHTMLElement(event),
                    (value) => {
                      if (value) {
                        statusToUpdate = { ...statusToUpdate, [status]: value }
                      }
                    }
                  )
                }}
              >
                <span slot="content" class="flex-row-center pointer-events-none">
                  <StatusRefPresenter value={newStatus} />
                </span>
              </Button>
            </div>
          </div>
        {/each}
      </div>
      <div class="mt-4">
        {#each missingComponents as component}
          {@const componentRef = componentToUpdate[component._id]}
          <div class="missing-items mt-4">
            <div class="side-columns aligned-text">
              <ComponentPresenter value={component} disabled />
            </div>
            <span class="middle-column aligned-text">-></span>
            <div class="side-columns aligned-text">
              <Button
                on:click={(event) => {
                  showPopup(
                    SelectPopup,
                    { value: componentValues, searchable: true },
                    eventToHTMLElement(event),
                    (value) => {
                      if (value !== undefined) {
                        componentToUpdate = { ...componentToUpdate, [component._id]: value }
                      }
                    }
                  )
                }}
              >
                <span slot="content" class="flex-row-center pointer-events-none">
                  <ComponentRefPresenter value={componentRef} />
                </span>
              </Button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  .missing-items {
    display: flex;
  }
  .side-columns {
    width: 40%;
  }
  .middle-column {
    width: 10%;
  }
  .aligned-text {
    display: flex;
    align-items: center;
  }
</style>
