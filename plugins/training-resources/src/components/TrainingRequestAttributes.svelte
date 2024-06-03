<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import type { TrainingRequest } from '@hcengineering/training'
  import type { Class } from '@hcengineering/core'
  import { AttributeBarEditor, getClient } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import training from '../plugin'
  import { canUpdateTrainingRequest, getCurrentEmployeeRef } from '../utils'
  import SentRequestCompletionPresenter from './SentRequestCompletionPresenter.svelte'

  type T = TrainingRequest

  export let object: T
  export let showHeader: boolean = false

  let objectClass: Class<T> | null = null
  $: objectClass = getClient().getHierarchy().getClass(object._class)

  let readonly = true
  $: readonly = !canUpdateTrainingRequest(object)
</script>

{#if showHeader && objectClass}
  <div class="popupPanel-title"><Label label={objectClass.label} /></div>
{/if}
<div class="popupPanel-body__aside-grid inCollapsed">
  {#if object.owner === getCurrentEmployeeRef()}
    <AttributeBarEditor {object} _class={object._class} key="trainees" {readonly} />
  {/if}
  <AttributeBarEditor {object} _class={object._class} key="owner" readonly />
  <AttributeBarEditor {object} _class={object._class} key="maxAttempts" readonly />
  <AttributeBarEditor {object} _class={object._class} key="dueDate" readonly />
  {#if object.owner === getCurrentEmployeeRef()}
    <span class="labelOnPanel"><Label label={training.string.TrainingRequestCompletion} /></span>
    <SentRequestCompletionPresenter value={object} />
  {/if}
  {#if object.canceledOn !== null}
    <AttributeBarEditor {object} _class={object._class} key="canceledOn" readonly />
    <AttributeBarEditor {object} _class={object._class} key="canceledBy" readonly />
  {/if}
  {#if object.canceledOn !== null}
    <AttributeBarEditor {object} _class={object._class} key="canceledOn" readonly />
    <AttributeBarEditor {object} _class={object._class} key="canceledBy" readonly />
  {/if}
</div>
