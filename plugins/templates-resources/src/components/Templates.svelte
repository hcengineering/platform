<script lang="ts">
  import core, { Data, Ref } from '@hcengineering/core'
  import { getEmbeddedLabel, getResource } from '@hcengineering/platform'
  import { createQuery, getClient, MessageViewer, SpaceSelector } from '@hcengineering/presentation'
  import { MessageTemplate, TemplateCategory } from '@hcengineering/templates'
  import { StyledTextEditor } from '@hcengineering/text-editor-resources'
  import {
    Action,
    Button,
    EditBox,
    eventToHTMLElement,
    IconAdd,
    IconEdit,
    Label,
    showPopup,
    Header,
    Breadcrumb,
    Separator,
    defineSeparators,
    settingsSeparators,
    Scroller
  } from '@hcengineering/ui'
  import { getActions as getContributedActions, TreeItem, TreeNode } from '@hcengineering/view-resources'
  import templatesPlugin from '../plugin'
  import CreateTemplateCategory from './CreateTemplateCategory.svelte'
  import FieldPopup from './FieldPopup.svelte'

  const client = getClient()
  const query = createQuery()
  const spaceQ = createQuery()
  let templates: MessageTemplate[] = []
  let selected: Ref<MessageTemplate> | undefined

  let title: string = ''
  let message: string = ''

  let newTemplate: boolean = false

  query.query(templatesPlugin.class.MessageTemplate, {}, (t) => {
    templates = t
    if (selected !== undefined && templates.findIndex((t) => t._id === selected) === -1) {
      selected = undefined
      newTemplate = false
    }
  })

  let spaces: TemplateCategory[] = []

  spaceQ.query(templatesPlugin.class.TemplateCategory, {}, (res) => {
    spaces = res
    space = res[0]?._id
  })

  const Mode = {
    View: 1,
    Edit: 2,
    Create: 3
  }
  let mode = Mode.View

  async function addTemplate (): Promise<void> {
    title = ''
    message = ''
    newTemplate = true
    mode = Mode.Create
  }
  async function saveNewTemplate (): Promise<void> {
    if (!newTemplate) {
      return
    }
    if (mode === Mode.Create) {
      if (title.trim().length > 0 && space !== undefined) {
        const ref = await client.createDoc(templatesPlugin.class.MessageTemplate, space, {
          title,
          message
        })
        selected = ref
      }
    } else if (selected !== undefined) {
      await client.updateDoc(templatesPlugin.class.MessageTemplate, templatesPlugin.space.Templates, selected, {
        title,
        message
      })
    }
    mode = Mode.View
  }

  let textEditor: StyledTextEditor

  export function submit (): void {
    textEditor.submit()
  }
  const updateTemplate = (evt: any) => {
    message = evt.detail
  }

  function addField (ev: MouseEvent) {
    showPopup(FieldPopup, {}, eventToHTMLElement(ev), (res) => {
      if (res !== undefined) {
        textEditor.insertText(`\${${res._id}}`)
      }
    })
  }

  function getTemplates (templates: MessageTemplate[], space: Ref<TemplateCategory>): MessageTemplate[] {
    return templates.filter((p) => p.space === space)
  }

  async function getActions (t: MessageTemplate): Promise<Action[]> {
    const result: Action[] = []
    const extraActions = await getContributedActions(client, t)
    for (const act of extraActions) {
      result.push({
        icon: act.icon ?? IconEdit,
        label: act.label,
        action: async (ctx: any, evt: Event) => {
          const impl = await getResource(act.action)
          await impl(t, evt, act.actionProps)
        }
      })
    }
    return result
  }

  const addSpace: Action = {
    label: templatesPlugin.string.CreateTemplateCategory,
    icon: IconAdd,
    action: async (): Promise<void> => {
      showPopup(CreateTemplateCategory, {}, 'top')
    }
  }

  async function getSpaceActions (space: TemplateCategory): Promise<Action[]> {
    const result: Action[] = [addSpace]
    const extraActions = await getContributedActions(client, space, core.class.Space)
    for (const act of extraActions) {
      result.push({
        icon: act.icon ?? IconEdit,
        label: act.label,
        action: async (ctx: any, evt: Event) => {
          const impl = await getResource(act.action)
          await impl(space, evt, act.actionProps)
        }
      })
    }
    return result
  }

  let space: Ref<TemplateCategory> | undefined = undefined
  defineSeparators('workspaceSettings', settingsSeparators)
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb
      icon={templatesPlugin.icon.Templates}
      label={templatesPlugin.string.Templates}
      size={'large'}
      isCurrent
    />
  </Header>

  <div class="hulyComponent-content__container columns">
    <div class="hulyComponent-content__column">
      <div id="create-template" class="flex-between trans-title flex-no-shrink bottom-divider p-3">
        <Button
          icon={templatesPlugin.icon.Template}
          label={templatesPlugin.string.CreateTemplate}
          justify={'left'}
          width={'100%'}
          on:click={addTemplate}
        />
      </div>

      <div class="flex-col overflow-y-auto">
        {#each spaces as space (space._id)}
          {@const getTemps = getTemplates(templates, space._id)}
          <TreeNode
            label={getEmbeddedLabel(space.name)}
            actions={async () => await getSpaceActions(space)}
            isFold
            noDivider
            empty={getTemps.length === 0}
          >
            {#each getTemps as t (t._id)}
              <TreeItem
                _id={space._id}
                title={t.title}
                actions={async () => await getActions(t)}
                on:click={() => {
                  selected = t._id
                  title = t.title
                  message = t.message
                  newTemplate = true
                  mode = Mode.View
                }}
                selected={selected === t._id}
              />
            {/each}
          </TreeNode>
        {/each}
      </div>
    </div>
    <Separator name={'workspaceSettings'} index={0} color={'var(--theme-divider-color)'} />
    <div class="hulyComponent-content__column content">
      <Scroller align={'center'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
        <div class="hulyComponent-content">
          {#if newTemplate}
            <div class="flex-between mr-4">
              <span class="trans-title mb-3">
                {#if mode === Mode.Create}
                  <Label label={templatesPlugin.string.CreateTemplate} />
                {:else if mode === Mode.Edit}
                  <Label label={templatesPlugin.string.EditTemplate} />
                {:else}
                  <Label label={templatesPlugin.string.ViewTemplate} />
                {/if}
              </span>
              {#if mode === Mode.Create}
                <SpaceSelector
                  _class={templatesPlugin.class.TemplateCategory}
                  label={templatesPlugin.string.TemplateCategory}
                  bind:space
                  create={{
                    component: templatesPlugin.component.CreateTemplateCategory,
                    label: templatesPlugin.string.CreateTemplateCategory
                  }}
                />
              {/if}
            </div>
            <div class="text-lg caption-color">
              {#if mode !== Mode.View}
                <EditBox bind:value={title} placeholder={templatesPlugin.string.TemplatePlaceholder} />
              {:else}
                {title}
              {/if}
            </div>
            <div class="separator" />
            {#if mode !== Mode.View}
              <StyledTextEditor bind:content={message} bind:this={textEditor} on:value={updateTemplate}>
                <div class="flex flex-reverse flex-grow">
                  <div class="ml-2">
                    <Button
                      disabled={title.trim().length === 0}
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
                          newTemplate = false
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
                <MessageViewer {message} />
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
      </Scroller>
    </div>
  </div>
</div>

<style lang="scss">
  .template-container {
    padding: 2.25rem 2.5rem 1.75rem;
    background-color: var(--theme-panel-color);
  }
  .separator {
    flex-shrink: 0;
    margin: 1.5rem 0;
    height: 1px;
    background-color: var(--theme-divider-color);
  }
  .text {
    flex-grow: 1;
    line-height: 150%;
  }
</style>
