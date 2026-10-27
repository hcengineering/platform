<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import { Analytics } from '@hcengineering/analytics'
  import { Ref, generateId, getCurrentAccount } from '@hcengineering/core'
  import type { IntlString } from '@hcengineering/platform'
  import presentation, { Card, SpaceSelector, getClient } from '@hcengineering/presentation'
  import { IssueTemplate, Project } from '@hcengineering/tracker'
  import { Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import ProjectPresenter from '../projects/ProjectPresenter.svelte'
  import IssueTemplatePresenter from './IssueTemplatePresenter.svelte'
  import { submitIssueTemplateCopy } from './submitCopy'

  export let value: IssueTemplate

  const dispatch = createEventDispatcher()
  const client = getClient()
  const me = getCurrentAccount()

  let space: Ref<Project> | undefined = undefined
  let error: IntlString | undefined

  function handleProjectChange (event: CustomEvent<Ref<Project> | null | undefined>): void {
    // SpaceSelector also reports the unavailable-target reset; keep that error visible.
    if (event.detail != null) error = undefined
  }

  async function copy (): Promise<void> {
    const target = space
    error = undefined
    try {
      const copied = await submitIssueTemplateCopy(client, value, target, me.uuid, generateId)
      // The selector stays usable during submission. A result belongs to its captured target;
      // a successful copy to an older target must also leave the newer selection open.
      if (space !== target) return
      if (!copied) {
        error = tracker.string.CopyTargetUnavailable
        space = undefined
        return
      }
      dispatch('close')
    } catch (err: any) {
      Analytics.handleError(err)
      if (space === target) error = tracker.string.CopyTemplateFailed
    }
  }
</script>

<Card
  label={tracker.string.CopyToProject}
  okAction={copy}
  closeOnSave={false}
  canSave={space !== undefined}
  okLabel={presentation.string.Copy}
  on:close={() => dispatch('close')}
  on:changeContent
>
  <svelte:fragment slot="header">
    <SpaceSelector
      _class={tracker.class.Project}
      query={{ archived: false, members: me.uuid, _id: { $ne: value.space } }}
      label={tracker.string.Project}
      bind:space
      on:change={handleProjectChange}
      autoSelect={false}
      kind={'regular'}
      size={'large'}
      component={ProjectPresenter}
      defaultIcon={tracker.icon.Home}
    />
  </svelte:fragment>
  <IssueTemplatePresenter {value} disabled />
  <svelte:fragment slot="error">
    <span role="alert">
      {#if error !== undefined}
        <Label label={error} />
      {/if}
    </span>
  </svelte:fragment>
</Card>
