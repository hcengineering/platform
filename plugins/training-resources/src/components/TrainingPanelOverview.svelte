<!--
  Copyright © 2023 Hardcore Engineering Inc.
-->

<script lang="ts">
  import { Icon, Label, navigate } from '@hcengineering/ui'
  import { Table } from '@hcengineering/view-resources'
  import { type Training } from '@hcengineering/training'
  import { Attachments, AttachmentStyleBoxEditor } from '@hcengineering/attachment-resources'
  import { AttributeBarEditor, getClient } from '@hcengineering/presentation'
  import { StyledTextBox } from '@hcengineering/text-editor-resources'
  import core from '@hcengineering/core'
  import documents from '@hcengineering/controlled-documents'
  import { trainingRoute, TrainingRouteTab } from '../routing/routes/trainingRoute'
  import { canViewTrainingOverview } from '../utils'
  import DocumentPresenter from './DocumentPresenter.svelte'
  import training from '../plugin'

  export let object: Training
  export let readonly: boolean = true

  $: void verifyRoute(object)

  async function verifyRoute (trn: Training): Promise<void> {
    if (!(await canViewTrainingOverview(trn))) {
      navigate(trainingRoute.build({ id: trn._id, tab: TrainingRouteTab.Overview }), true)
    }
  }

  let boundary: HTMLElement
  const hierarchy = getClient().getHierarchy()
  const descriptionAttr = hierarchy.getAttribute(training.class.Training, 'description')

  function onDescriptionChange (e: CustomEvent<string>): void {
    void getClient().updateDoc(object._class, object.space, object._id, { description: e.detail })
  }
</script>

<div class="pl-6 pr-6 pb-16" bind:this={boundary}>
  <div class="title font-semi-bold pt-6 pb-6 caption-color relative overflow-label">
    <AttributeBarEditor showHeader={false} {object} _class={object._class} key="title" {readonly} />
  </div>

  <div class="text-base">
    {#if readonly}
      <StyledTextBox
        mode={1}
        hideExtraButtons
        isScrollable={false}
        showButtons={false}
        content={object.description}
        placeholder={core.string.Description}
        kitOptions={{ reference: true }}
        on:blur={onDescriptionChange}
      />
    {:else}
      <AttachmentStyleBoxEditor
        {object}
        key={{ key: 'description', attr: descriptionAttr }}
        placeholder={core.string.Description}
        {boundary}
      />
    {/if}
  </div>

  <section class="antiSection pt-6">
    <div class="antiSection-header">
      <div class="antiSection-header__icon">
        <Icon icon={documents.icon.Document} size={'small'} />
      </div>
      <span class="antiSection-header__title">
        <Label label={documents.string.Documents} />
      </span>
    </div>
    <Table
      _class={documents.class.Document}
      config={[
        { key: '', sortingKey: 'code', presenter: DocumentPresenter, label: documents.string.Document },
        'title',
        { key: '', label: documents.string.Version, presenter: documents.component.DocumentVersionPresenter },
        'state',
        'modifiedOn'
      ]}
      query={{
        [`${documents.mixin.DocumentTraining}.training`]: object._id,
        [`${documents.mixin.DocumentTraining}.enabled`]: true
      }}
      readonly
    />
  </section>

  {#if readonly}
    <section class="pt-6">
      <Attachments
        objectId={object._id}
        space={object.space}
        _class={object._class}
        attachments={object.attachments}
        {readonly}
        showHeader
      />
    </section>
  {/if}
</div>

<style lang="scss">
  .title {
    font-size: 2.25rem;
  }
</style>
