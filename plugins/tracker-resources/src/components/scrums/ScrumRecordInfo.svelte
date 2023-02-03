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
  import { DateRangeMode, WithLookup } from '@hcengineering/core'
  import { Scrum, ScrumRecord } from '@hcengineering/tracker'
  import { DateRangePresenter, Label } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import { EmployeeRefPresenter } from '@hcengineering/contact-resources'

  export let scrumRecord: WithLookup<ScrumRecord>
  export let scrum: Scrum
</script>

<div class="content">
  <span class="label fs-bold">
    <Label label={tracker.string.ScrumRecorder} />
  </span>
  <EmployeeRefPresenter value={scrumRecord.$lookup?.scrumRecorder?.employee} />

  <span class="label fs-bold">
    <Label label={tracker.string.ScrumBeginTime} />
  </span>
  <DateRangePresenter value={scrumRecord.startTs} mode={DateRangeMode.DATETIME} kind="link" editable={false} />

  {#if scrumRecord.endTs}
    <span class="label fs-bold">
      <Label label={tracker.string.ScrumEndTime} />
    </span>
    <DateRangePresenter value={scrumRecord.endTs} mode={DateRangeMode.DATETIME} kind="link" editable={false} />
  {/if}

  <span class="label fs-bold">
    <Label label={tracker.string.Scrum} />
  </span>
  <span class="fs-bold scrumTitle">
    {scrum.title}
  </span>
</div>

<style lang="scss">
  .content {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    grid-auto-flow: row;
    justify-content: start;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
    width: 100%;
    height: min-content;
  }

  .scrumTitle {
    color: var(--accent-color);
  }
</style>
