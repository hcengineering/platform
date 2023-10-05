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
  import { Button, Label, Grid, IconArrowRight, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import { Component, Issue, IssueStatus, Project } from '@hcengineering/tracker'
  import { statusStore } from '@hcengineering/view-resources'

  import tracker from '../../../plugin'
  import { ComponentToUpdate, StatusToUpdate } from '../../../utils'
  import ComponentPresenter from '../../components/ComponentPresenter.svelte'
  import ComponentRefPresenter from '../../components/ComponentRefPresenter.svelte'
  import StatusRefPresenter from '../StatusRefPresenter.svelte'
  import StatusReplacementPopup from './StatusReplacementPopup.svelte'
  import ComponentReplacementPopup from './ComponentReplacementPopup.svelte'

  export let targetProject: Project
  export let currentProject: Ref<Project>
  export let issues: Issue[]
  export let statuses: IssueStatus[] = []
  export let components: Component[] = []
  export let statusToUpdate: Record<Ref<IssueStatus>, StatusToUpdate | undefined>
  export let componentToUpdate: Record<Ref<Component>, ComponentToUpdate | undefined>

  $: if (targetProject !== undefined) {
    for (const i of issues) {
      const status = statusToUpdate[i.status]
      if (status?.create !== true) {
        if (!targetProject.states.includes(i.status)) {
          if (status?.ref === undefined) {
            statusToUpdate[i.status] = { ref: targetProject.defaultIssueStatus }
          } else if (!targetProject.states.includes(status.ref)) {
            statusToUpdate[i.status] = { ref: targetProject.defaultIssueStatus }
          }
        } else {
          delete statusToUpdate[i.status]
        }
      }

      if (i.component !== undefined && i.component !== null) {
        const cur = components.find((it) => it._id === i.component)
        if (cur !== undefined) {
          const component = componentToUpdate[i.component]
          if (
            component !== undefined &&
            components.find((it) => it._id === component.ref)?.space !== targetProject._id
          ) {
            componentToUpdate[cur._id] = undefined
          }
          if (component === undefined) {
            const componentRef = components.find((it) => it.space === targetProject?._id && it.label === cur.label)?._id
            if (componentRef !== undefined) {
              componentToUpdate[cur._id] = { ref: componentRef }
            }
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

  const getStatusRef = (status: string) => status as Ref<Status>
</script>

{#if issues[0]?.space !== targetProject._id && (Object.keys(statusToUpdate).length > 0 || missingComponents.length > 0)}
  <div class="caption-color mb-4">
    <Label label={tracker.string.SelectReplacement} />
  </div>

  <Grid rowGap={0.25} columnGap={2}>
    <div class="flex-row-center min-h-8 content-dark-color text-xs font-medium tracking-1px uppercase">
      <Label label={tracker.string.MissingItem} />
    </div>
    <div class="flex-row-center min-h-8 content-dark-color text-xs font-medium tracking-1px uppercase">
      <Label label={tracker.string.Replacement} />
    </div>
    {#each Object.keys(statusToUpdate) as status}
      {@const newStatus = statusToUpdate[getStatusRef(status)]}
      <div class="flex-between min-h-11">
        <StatusRefPresenter value={getStatusRef(status)} space={currentProject} kind={'list-header'} />
        <IconArrowRight size={'small'} fill={'var(--theme-halfcontent-color)'} />
      </div>
      <div class="flex-row-center min-h-11">
        <Button
          size={'large'}
          shape={'round-sm'}
          width={'min-content'}
          on:click={(event) => {
            if (newStatus === undefined) {
              return
            }
            showPopup(
              StatusReplacementPopup,
              {
                statuses,
                space: targetProject._id,
                original: $statusStore.get(getStatusRef(status)),
                selected: getStatusRef(newStatus.ref)
              },
              eventToHTMLElement(event),
              (value) => {
                if (value) {
                  const createStatus = typeof value === 'object'
                  const s = createStatus ? value.create : value
                  statusToUpdate = { ...statusToUpdate, [status]: { ref: s, create: createStatus } }
                }
              }
            )
          }}
        >
          <span slot="content" class="flex-row-center pointer-events-none">
            {#if newStatus !== undefined}
              <StatusRefPresenter space={targetProject._id} value={getStatusRef(newStatus.ref)} />
            {/if}
          </span>
        </Button>
      </div>
    {/each}
    {#each missingComponents as component}
      {@const componentRef = componentToUpdate[component._id]?.ref}
      <div class="flex-between min-h-11">
        <ComponentPresenter value={component} disabled />
        <IconArrowRight size={'small'} fill={'var(--theme-halfcontent-color)'} />
      </div>
      <div class="flex-row-center min-h-11">
        <Button
          size={'large'}
          shape={'round-sm'}
          width={'min-content'}
          on:click={(event) => {
            showPopup(
              ComponentReplacementPopup,
              {
                components: components.filter((it) => it.space === targetProject._id),
                original: component,
                selected: componentRef
              },
              eventToHTMLElement(event),
              (value) => {
                if (value !== undefined) {
                  const createComponent = typeof value === 'object'
                  const c = createComponent ? value.create : value
                  componentToUpdate = {
                    ...componentToUpdate,
                    [component._id]: { ref: c, create: createComponent }
                  }
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
    {/each}
  </Grid>
{/if}
