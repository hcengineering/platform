<script lang="ts">
  import { Data, Ref } from '@hcengineering/core'
  import { getClient, LiveQuery, MessageViewer } from '@hcengineering/presentation'
  import { MessageTemplate } from '@hcengineering/templates'
  import { StyledTextEditor } from '@hcengineering/text-editor'
  import { Button, CircleButton, EditBox, eventToHTMLElement, Icon, IconAdd, Label, showPopup } from '@hcengineering/ui'
  import templatesPlugin from '../plugin'
  import FieldPopup from './FieldPopup.svelte'
  import TemplateElement from './TemplateElement.svelte'

  const client = getClient()
  const query = new LiveQuery()
  let templates: MessageTemplate[] = []
  let selected: Ref<MessageTemplate> | undefined
  let newTemplate: Data<MessageTemplate> | undefined = undefined
  let loading = true

  query.query(templatesPlugin.class.MessageTemplate, {}, (t) => {
    templates = t
    if (templates.findIndex((t) => t._id === selected) === -1) {
      selected = undefined
      newTemplate = undefined
    }
    loading = false
  })

  const Mode = {
    View: 1,
    Edit: 2,
    Create: 3
  }
  let mode = Mode.View

  async function addTemplate (): Promise<void> {
    newTemplate = {
      title: '',
      message: ''
    }
    mode = Mode.Create
  }
  async function saveNewTemplate (): Promise<void> {
    if (newTemplate === undefined) {
      return
    }
    if (mode === Mode.Create) {
      if (newTemplate.title.trim().length > 0) {
        const ref = await client.createDoc(
          templatesPlugin.class.MessageTemplate,
          templatesPlugin.space.Templates,
          newTemplate
        )
        selected = ref
      }
    } else if (selected !== undefined) {
      await client.updateDoc(
        templatesPlugin.class.MessageTemplate,
        templatesPlugin.space.Templates,
        selected,
        newTemplate
      )
    }
    mode = Mode.View
  }

  let textEditor: StyledTextEditor

  export function submit (): void {
    textEditor.submit()
  }
  const updateTemplate = (evt: any) => {
    newTemplate = { title: newTemplate?.title ?? '', message: evt.detail }
  }

  function addField (ev: MouseEvent) {
    showPopup(FieldPopup, {}, eventToHTMLElement(ev), (res) => {
      if (res !== undefined) {
        textEditor.insertText(`\${${res._id}}`)
      }
    })
  }
</script>

<div class="antiComponent">
  <div class="ac-header short divide">
    <div class="ac-header__icon"><Icon icon={templatesPlugin.icon.Templates} size={'medium'} /></div>
    <div class="ac-header__title"><Label label={templatesPlugin.string.Templates} /></div>
  </div>

  <div class="ac-body columns">
    <div class="ac-column">
      <div id="create-template" class="flex-between trans-title mb-3">
        <Label label={templatesPlugin.string.TemplatesHeader} />
        {#if !loading}
          <CircleButton icon={IconAdd} on:click={addTemplate} />
        {/if}
      </div>

      <div class="flex-col overflow-y-auto">
        {#each templates as t}
          <TemplateElement
            label={t.title}
            active={newTemplate === undefined && t._id === selected}
            on:click={() => {
              selected = t._id
              newTemplate = { title: t.title, message: t.message }
              mode = Mode.View
            }}
            object={t}
          />
        {/each}
      </div>
    </div>

    <div class="ac-column max background-bg-accent template-container">
      {#if newTemplate}
        <span class="trans-title mb-3">
          {#if mode === Mode.Create}
            <Label label={templatesPlugin.string.CreateTemplate} />
          {:else if mode === Mode.Edit}
            <Label label={templatesPlugin.string.EditTemplate} />
          {:else}
            <Label label={templatesPlugin.string.ViewTemplate} />
          {/if}
        </span>
        <div class="text-lg caption-color">
          {#if mode !== Mode.View}
            <EditBox bind:value={newTemplate.title} placeholder={templatesPlugin.string.TemplatePlaceholder} />
          {:else}
            {newTemplate.title}
          {/if}
        </div>
        <div class="separator" />
        {#if mode !== Mode.View}
          <StyledTextEditor bind:content={newTemplate.message} bind:this={textEditor} on:value={updateTemplate}>
            <div class="flex flex-reverse flex-grow">
              <div class="ml-2">
                <Button
                  disabled={newTemplate.title.trim().length === 0}
                  kind={'primary'}
                  label={templatesPlugin.string.SaveTemplate}
                  on:click={saveNewTemplate}
                />
              </div>
              <div class="ml-2">
                <Button
                  label={templatesPlugin.string.Cancel}
                  on:click={() => {
                    if (mode === Mode.Create) {
                      newTemplate = undefined
                    }
                    mode = Mode.View
                  }}
                />
              </div>
              <Button label={templatesPlugin.string.Field} on:click={addField} />
            </div>
          </StyledTextEditor>
        {:else}
          <div class="text">
            <MessageViewer message={newTemplate.message} />
          </div>
          <div class="flex flex-reverse">
            <Button
              kind={'primary'}
              label={templatesPlugin.string.EditTemplate}
              on:click={() => {
                mode = Mode.Edit
              }}
            />
          </div>
        {/if}
      {/if}
    </div>
  </div>
</div>

<style lang="scss">
  .template-container {
    padding: 2.25rem 2.5rem 1.75rem;
  }
  .separator {
    flex-shrink: 0;
    margin: 1.5rem 0;
    height: 1px;
    background-color: var(--theme-menu-divider);
  }
  .text {
    flex-grow: 1;
    line-height: 150%;
  }
</style>
