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
  import { Ref } from '@hcengineering/core'
  import { Button, Grid, IconArrowRight, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import { Component, Issue, Project } from '@hcengineering/tracker'

  import { IssueToUpdate } from '../../../utils'
  import ComponentPresenter from '../../components/ComponentPresenter.svelte'
  import ComponentReplacementPopup from './ComponentReplacementPopup.svelte'

  export let issue: Issue
  export let targetProject: Project
  export let issueToUpdate: Map<Ref<Issue>, IssueToUpdate> = new Map()
  export let components: Component[]

  $: current = components.find((it) => it._id === issue.component)
  $: replace = components.find((it) => it._id === issueToUpdate.get(issue._id)?.component)
</script>

{#if current !== undefined}
  <Grid rowGap={0.25} topGap>
    <div class="flex-between min-h-11">
      <ComponentPresenter value={current} disabled />
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
              original: current,
              selected: replace
            },
            eventToHTMLElement(event),
            (value) => {
              if (value) {
                const createComponent = typeof value === 'object'
                const c = createComponent ? value.create : value
                issueToUpdate.set(issue._id, {
                  ...issueToUpdate.get(issue._id),
                  component: c,
                  useComponent: true,
                  createComponent
                })
              }
            }
          )
        }}
      >
        <span slot="content" class="flex-row-center pointer-events-none">
          <ComponentPresenter value={replace} />
        </span>
      </Button>
    </div>
  </Grid>
{/if}

<style lang="scss">
  .side-columns {
    width: 45%;
  }
  .middle-column {
    width: 10%;
  }
  .aligned-text {
    display: flex;
    align-items: center;
  }
</style>
