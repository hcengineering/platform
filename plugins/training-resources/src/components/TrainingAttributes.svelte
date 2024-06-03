<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import type { Training } from '@hcengineering/training'
  import type { Class } from '@hcengineering/core'
  import { AttributeBarEditor, getClient } from '@hcengineering/presentation'
  import { Button, Label } from '@hcengineering/ui'
  import training from '../plugin'
  import TrainingPassingScorePresenter from './TrainingPassingScorePresenter.svelte'

  type T = Training

  export let object: T
  export let showHeader: boolean = false

  let objectClass: Class<T> | null = null
  $: objectClass = getClient().getHierarchy().getClass(object._class)
</script>

{#if showHeader && objectClass}
  <div class="popupPanel-title"><Label label={objectClass.label} /></div>
{/if}
<div class="popupPanel-body__aside-grid inCollapsed">
  <span class="labelOnPanel"><Label label={training.string.TrainingPassingScore} /></span>
  <Button kind="link" justify="left">
    <TrainingPassingScorePresenter slot="content" value={object} />
  </Button>
  <AttributeBarEditor {object} _class={object._class} key="owner" readonly />
  <AttributeBarEditor {object} _class={object._class} key="createdOn" readonly />
  <AttributeBarEditor {object} _class={object._class} key="author" readonly />
  {#if object.releasedOn !== null}
    <AttributeBarEditor {object} _class={object._class} key="releasedOn" readonly />
    <AttributeBarEditor {object} _class={object._class} key="releasedBy" readonly />
  {/if}
</div>
