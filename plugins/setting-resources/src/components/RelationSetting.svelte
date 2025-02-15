<script lang="ts">
  import core, { Association, Class, Data, Doc, Ref } from '@hcengineering/core'
  import { IntlString, translate } from '@hcengineering/platform'
  import { createQuery, getClient, MessageBox } from '@hcengineering/presentation'
  import {
    Breadcrumb,
    Button,
    defineSeparators,
    Header,
    IconDelete,
    Separator,
    showPopup,
    twoPanelsSeparators
  } from '@hcengineering/ui'
  import view from '@hcengineering/view-resources/src/plugin'
  import settings from '../plugin'
  import card from '@hcengineering/card'
  import AssociationEditor from './AssociationEditor.svelte'

  export let _classes: Ref<Class<Doc>>[] = [core.class.Doc]
  export let exclude: Ref<Class<Doc>>[] = [card.class.Card]

  const query = createQuery()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let selected: Association | Data<Association> | undefined

  let associations: Association[] = []

  query.query(core.class.Association, {}, (res) => {
    associations = res
  })

  $: filtered = filterAssociations(associations, _classes, exclude)

  function filterAssociations (
    associations: Association[],
    _classes: Ref<Class<Doc>>[],
    exclude: Ref<Class<Doc>>[]
  ): Association[] {
    _classes = _classes ?? [core.class.Doc]
    exclude = exclude ?? [card.class.Card]
    const res: Association[] = []
    const descendants = new Set(_classes.map((p) => hierarchy.getDescendants(p)).reduce((a, b) => a.concat(b)))
    const excluded = new Set()
    for (const _class of exclude) {
      const desc = hierarchy.getDescendants(_class)
      for (const _id of desc) {
        excluded.add(_id)
      }
    }
    for (const association of associations) {
      if (
        descendants.has(association.classA) &&
        descendants.has(association.classB) &&
        !excluded.has(association.classA) &&
        !excluded.has(association.classB)
      ) {
        res.push(association)
      }
    }
    return res
  }

  function createRelation (): void {
    selected = {
      classA: '' as Ref<Class<Doc>>,
      classB: '' as Ref<Class<Doc>>,
      nameA: '',
      nameB: '',
      type: '1:1'
    }
  }

  function isAssociation (data: Data<Association> | Association | undefined): data is Association {
    return (data as Association)?._id !== undefined
  }

  function getClassLabel (_class: Ref<Class<Doc>>): IntlString | undefined {
    const _classLabel = client.getModel().findObject(_class)
    return _classLabel?.label
  }

  async function getLabel (association: Association): Promise<string> {
    const aLabel = getClassLabel(association.classA)
    const bLabel = getClassLabel(association.classB)
    const aClass = aLabel !== undefined ? await translate(aLabel, {}) : undefined
    const bClass = bLabel !== undefined ? await translate(bLabel, {}) : undefined
    return `${association.nameA} ${aClass !== undefined ? '(' + aClass + ')' : ''} - ${association.nameB} ${bClass !== undefined ? '(' + bClass + ')' : ''}`
  }

  defineSeparators('workspaceSettings', twoPanelsSeparators)

  async function remove (val: Association | Data<Association> | undefined): Promise<void> {
    if (isAssociation(val)) {
      showPopup(MessageBox, {
        label: view.string.DeleteObject,
        message: view.string.DeleteObjectConfirm,
        params: { count: 1 },
        dangerous: true,
        action: async () => {
          selected = undefined
          await client.remove(val)
        }
      })
    }
  }
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={settings.icon.Relations} label={core.string.Relations} size={'large'} isCurrent />

    <svelte:fragment slot="actions">
      {#if isAssociation(selected)}
        <Button icon={IconDelete} label={view.string.Delete} kind={'dangerous'} on:click={() => remove(selected)} />
      {/if}
    </svelte:fragment>
  </Header>

  <div class="hulyComponent-content__container columns">
    <div class="hulyComponent-content__column">
      <div class="ulyComponent-content__navHeader flex-between trans-title flex-no-shrink bottom-divider p-3">
        <Button
          icon={view.icon.Add}
          label={core.string.AddRelation}
          justify={'left'}
          width={'100%'}
          on:click={createRelation}
        />
      </div>

      <div class="flex-col overflow-y-auto">
        {#each filtered as association (association._id)}
          <button
            class="list-item"
            class:selected={selected === association}
            on:click={() => {
              selected = association
            }}
          >
            {#await getLabel(association) then label}
              <span class="font-regular-14 overflow-label">{label}</span>
            {/await}
          </button>
        {/each}
      </div>
    </div>
    <Separator name={'workspaceSettings'} index={0} color={'var(--theme-divider-color)'} />
    {#if selected !== undefined}
      <AssociationEditor
        {exclude}
        {_classes}
        association={selected}
        on:close={() => {
          selected = undefined
        }}
      />
    {/if}
  </div>
</div>

<style lang="scss">
  .list-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 0 var(--spacing-1_5);
    padding: var(--spacing-1) var(--spacing-1_25);
    text-align: left;
    border: none;
    border-radius: var(--small-BorderRadius);
    outline: none;

    & :global(button.type-button-icon) {
      visibility: hidden;
    }
    &:hover {
      background-color: var(--theme-button-hovered);

      & :global(button.type-button-icon) {
        visibility: visible;
      }
    }
    &.selected {
      background-color: var(--theme-button-default);
      cursor: default;
    }
  }
</style>
