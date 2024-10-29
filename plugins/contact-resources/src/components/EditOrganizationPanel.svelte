<script lang="ts">
  import { AttachmentStyleBoxCollabEditor } from '@hcengineering/attachment-resources'
  import core, { Class, Doc, Mixin, Ref } from '@hcengineering/core'
  import notification from '@hcengineering/notification'
  import { Panel } from '@hcengineering/panel'
  import { getResource } from '@hcengineering/platform'
  import presentation, { createQuery, getClient, type KeyedAttribute } from '@hcengineering/presentation'
  import { type AnyComponent, Button, Component, IconMixin, IconMoreH, Label } from '@hcengineering/ui'
  import view, { AttributeCategory } from '@hcengineering/view'
  import {
    DocAttributeBar,
    DocNavLink,
    getCollectionCounter,
    getDocAttrsInfo,
    getDocMixins,
    showMenu
  } from '@hcengineering/view-resources'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import { Organization } from '@hcengineering/contact'

  import contact from '../plugin'
  import EditOrganization from './EditOrganization.svelte'

  export let _id: Ref<Organization>
  export let embedded: boolean = false
  export let readonly: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const query = createQuery()

  const dispatch = createEventDispatcher()
  const inboxClient = getResource(notification.function.GetInboxNotificationsClient).then((res) => res())

  const ignoreKeys = ['comments', 'name', 'channels', 'description']

  let object: Organization | undefined = undefined
  let lastId: Ref<Organization> | undefined = undefined

  let mixins: Mixin<Doc>[] = []
  let editors: Array<{ key: KeyedAttribute, editor: AnyComponent, category: AttributeCategory }> = []

  let showAllMixins = false
  let saved = false

  $: mixins = object ? getDocMixins(object, showAllMixins) : []

  $: descriptionKey = client.getHierarchy().getAttribute(contact.class.Organization, 'description')

  $: getDocAttrsInfo(mixins, ignoreKeys, contact.class.Organization).then((res) => {
    editors = res.editors
  })

  function getEditorFooter (
    _class: Ref<Class<Doc>>,
    object?: Doc
  ): { footer: AnyComponent, props?: Record<string, any> } | undefined {
    if (object !== undefined) {
      const footer = hierarchy.findClassOrMixinMixin(object, view.mixin.ObjectEditorFooter)
      if (footer !== undefined) {
        return { footer: footer.editor, props: footer.props }
      }
    }

    return undefined
  }

  $: editorFooter = getEditorFooter(contact.class.Organization, object)
  $: updateObject(_id)

  function updateObject (_id: Ref<Organization>): void {
    if (lastId !== _id) {
      const prev = lastId
      lastId = _id
      if (prev !== undefined) {
        void inboxClient.then((client) => client.readDoc(prev))
      }
      query.query(contact.class.Organization, { _id }, (result) => {
        object = result[0]
      })
    }
  }

  onDestroy(async () => {
    void inboxClient.then((client) => client.readDoc(_id))
  })
</script>

{#if object}
  <Panel
    isHeader={false}
    isSub={false}
    isAside={true}
    {embedded}
    {object}
    on:open
    on:close={() => {
      dispatch('close')
    }}
  >
    <svelte:fragment slot="title">
      <DocNavLink noUnderline {object}>
        <div class="title">{object.name}</div>
      </DocNavLink>
    </svelte:fragment>

    <svelte:fragment slot="attributes" let:direction={dir}>
      {#if dir === 'column'}
        <DocAttributeBar {object} {mixins} {ignoreKeys} />
      {/if}
    </svelte:fragment>

    <svelte:fragment slot="pre-utils">
      {#if saved}
        <Label label={presentation.string.Saved} />
      {/if}
    </svelte:fragment>

    <svelte:fragment slot="utils">
      <Button
        icon={IconMoreH}
        iconProps={{ size: 'medium' }}
        kind={'icon'}
        on:click={(e) => {
          showMenu(e, { object, excludedActions: [view.action.Open] })
        }}
      />
      <Button
        icon={IconMixin}
        kind={'icon'}
        iconProps={{ size: 'medium' }}
        selected={showAllMixins}
        on:click={() => {
          showAllMixins = !showAllMixins
        }}
      />
    </svelte:fragment>

    <div class="flex-col flex-grow flex-no-shrink step-tb-6">
      <EditOrganization {object} />
      <div class="flex-col flex-grow w-full mt-6 relative">
        <AttachmentStyleBoxCollabEditor
          focusIndex={30}
          {object}
          key={{ key: 'description', attr: descriptionKey }}
          placeholder={core.string.Description}
          enableAttachments={false}
          on:saved={(evt) => {
            saved = evt.detail
          }}
        />
      </div>
    </div>

    {#each editors as editor}
      {#if editor.editor}
        <div class="step-tb-6">
          <Component
            is={editor.editor}
            props={{
              objectId: object._id,
              _class: editor.key.attr.attributeOf,
              object,
              space: object.space,
              key: editor.key,
              readonly,
              [editor.key.key]: getCollectionCounter(hierarchy, object, editor.key)
            }}
          />
        </div>
      {/if}
    {/each}
    {#if editorFooter}
      <div class="step-tb-6">
        <Component
          is={editorFooter.footer}
          props={{ object, _class: contact.class.Organization, ...editorFooter.props, readonly }}
        />
      </div>
    {/if}
  </Panel>
{/if}
