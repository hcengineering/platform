<!--
//
// Copyright © 2024 Hardcore Engineering Inc.
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
//
-->

<script lang="ts">
  import questions from '@hcengineering/questions'
  import { AnswersCollectionEditor } from '@hcengineering/questions-resources'
  import {
    type Training,
    type TrainingAttempt,
    TrainingAttemptState,
    type TrainingRequest
  } from '@hcengineering/training'
  import { Button, Label } from '@hcengineering/ui'
  import training from '../plugin'
  import { canUpdateTrainingAttempt, getCurrentEmployeeRef, submitTrainingAttempt } from '../utils'
  import Score from './Score.svelte'

  export let trainingObject: Training
  export let request: TrainingRequest
  export let attempt: TrainingAttempt

  let readonly = true
  $: readonly = !canUpdateTrainingAttempt(attempt, request, trainingObject)

  let submitted = false
  $: submitted = attempt.state !== TrainingAttemptState.Draft

  let passed = false
  $: passed = attempt.state === TrainingAttemptState.Passed

  let showDiffs = false
  $: {
    const currentEmployeeRef = getCurrentEmployeeRef()
    showDiffs = passed || (request.owner === currentEmployeeRef && attempt.owner !== currentEmployeeRef)
  }
</script>

<div class="root">
  <div class="relative vScroll">
    <div class="pl-6 pr-6 pt-4 pb-4 max-w-240 mx-auto">
      {#if attempt.score !== null && attempt.assessmentsTotal !== null && attempt.assessmentsPassed !== null}
        <span
          class="score"
          class:passed={attempt.state === TrainingAttemptState.Passed}
          class:failed={attempt.state === TrainingAttemptState.Failed}
        >
          <span class="fs-bold text-base"><Label label={questions.string.Score} /></span>
          <span class="flex-grow"></span>
          <span class="fs-bold">
            <Score count={attempt.assessmentsPassed} total={attempt.assessmentsTotal} score={attempt.score} />
          </span>
        </span>
      {/if}
      <AnswersCollectionEditor
        {readonly}
        questionsParent={trainingObject}
        questionsKey="questions"
        answersParent={attempt}
        answersKey="answers"
        showStatuses={submitted}
        {showDiffs}
      />
    </div>
  </div>
  {#if !readonly}
    <footer class="top-divider">
      <div class="pl-6 pr-6 pt-4 pb-4 max-w-240 mx-auto">
        <Button
          kind="primary"
          label={training.string.TrainingAttemptSubmit}
          on:click={() => submitTrainingAttempt(attempt, request, trainingObject)}
        />
      </div>
    </footer>
  {/if}
</div>

<style lang="scss">
  .root {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    position: absolute;
    width: 100%;
  }

  .score {
    align-items: center;
    border-radius: 1rem;
    color: var(--primary-button-color);
    display: flex;
    flex-wrap: nowrap;
    padding: 0.5rem 1rem;
    width: 100%;

    &.passed {
      background-color: var(--positive-button-default);
    }

    &.failed {
      background-color: var(--negative-button-default);
    }
  }
</style>
