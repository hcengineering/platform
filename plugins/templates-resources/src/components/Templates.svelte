<script lang="ts">
  import { Data, Ref } from '@anticrm/core'
  import { getClient, LiveQuery, MessageViewer } from '@anticrm/presentation'
  import { MessageTemplate } from '@anticrm/templates'
  import { StyledTextEditor } from '@anticrm/text-editor'
  import { Button, CircleButton, EditBox, Icon, IconAdd, Label, ScrollBox } from '@anticrm/ui'
  import templatesPlugin from '../plugin'
  import TemplateElement from './TemplateElement.svelte'

  const client = getClient()
  const query = new LiveQuery()
  let templates: MessageTemplate[] = []
  let selected: Ref<MessageTemplate> | undefined
  let newTemplate: Data<MessageTemplate> | undefined = undefined
  
  query.query(templatesPlugin.class.MessageTemplate, {}, (t) => {
    templates = t
    if (templates.findIndex(t => t._id === selected) === -1) {
      selected = undefined
      newTemplate = undefined
    }
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
        const ref = await client.createDoc(templatesPlugin.class.MessageTemplate, templatesPlugin.space.Templates, newTemplate)
        selected = ref
      }
    } else if (selected !== undefined) {
      await client.updateDoc(templatesPlugin.class.MessageTemplate, templatesPlugin.space.Templates, selected, newTemplate)
    }
    mode = Mode.View
  }

  let textEditor: StyledTextEditor

  export function submit (): void {
    textEditor.submit()
  }
</script>

<div class="flex-between navheader-container">
  <span class="fs-title overflow-label flex-row-center">
    <div class="mr-2">
      <Icon icon={templatesPlugin.icon.Templates} size={'medium'} />
    </div>
    <Label label={templatesPlugin.string.Templates} />
  </span>
</div>

<div class="flex flex-grow">
  <div class="tempaltes-nav flex-row">
    <div class="flex-between flex-reverse">
      <CircleButton icon={IconAdd} on:click={addTemplate} />
      <Label label={templatesPlugin.string.TemplatesHeader} />
    </div>
    <div class="templates flex-row">
      <ScrollBox vertical stretch>       
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
      </ScrollBox>
    </div>
  </div>
  <div class="templates-edit">
    {#if newTemplate}
      <span class="fs-title overflow-label">
        {#if mode === Mode.Create}
          <Label label={templatesPlugin.string.CreateTemplate} />
        {:else if mode === Mode.Edit}
          <Label label={templatesPlugin.string.EditTemplate} />
        {:else}
          <Label label={templatesPlugin.string.ViewTemplate} />
        {/if}
      </span>
      <div class="titleedit mt-4 mb-4">
        {#if mode !== Mode.View}
          <EditBox bind:value={newTemplate.title} maxWidth={'12rem'} placeholder={templatesPlugin.string.TemplatePlaceholder} />
        {:else}
          {newTemplate.title}
        {/if}
      </div>
      {#if mode !== Mode.View}
        <StyledTextEditor
          bind:content={newTemplate.message}
          bind:this={textEditor}
          on:value={(evt) => {
            newTemplate = { title: newTemplate?.title ?? '', message: evt.detail }
          }}>
          <div class="flex flex-reverse flex-reverse flex-grow">
            <div class="ml-2">
              <Button disabled={newTemplate.title.trim().length == 0 } primary label={templatesPlugin.string.SaveTemplate} on:click={saveNewTemplate} />
            </div>
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
        </StyledTextEditor>
      {:else}
        <div class='text'>
          <MessageViewer message={newTemplate.message}/>
        </div>
        <div class='flex flex-reverse'>
          <Button primary label={templatesPlugin.string.EditTemplate} on:click={() => { mode = Mode.Edit }} />
        </div>
      {/if}
    {/if}
  </div>
</div>

<style lang="scss">
  .navheader-container {
    padding: 0 1.75rem;
    height: 4rem;
    border-bottom: 1px solid var(--theme-menu-divider);
  }
  .tempaltes-nav {
    width: 425px;
    border-right: 1px solid var(--theme-menu-divider);
    padding: 2rem;
    display: flex;
    flex-direction: column;   
  }
  .templates-edit {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    padding: 2rem;
    background-color: var(--theme-button-bg-enabled);

    .titleedit {
      font-size: 18px;
      border-bottom: 1px solid var(--theme-menu-divider);
      padding-bottom: 2rem;
    }
  }
  .templates {
    margin-top: 2rem;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .text {
    flex-grow: 1;
    line-height: 150%;
  }
</style>
