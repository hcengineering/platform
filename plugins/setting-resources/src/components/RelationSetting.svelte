<script lang="ts">
  import core, { Association, Class, Data, Doc, Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Button, Header, Breadcrumb, Separator, defineSeparators, twoPanelsSeparators } from '@hcengineering/ui'
  import settings from '../plugin'
  import view from '@hcengineering/view'
  import AssociationEditor from './AssociationEditor.svelte'

  const query = createQuery()

  let selected: Association | Data<Association> | undefined

  let associations: Association[] = []

  query.query(core.class.Association, {}, (res) => {
    associations = res
  })

  function createRelation (): void {
    selected = {
      classA: '' as Ref<Class<Doc>>,
      classB: '' as Ref<Class<Doc>>,
      nameA: '',
      nameB: '',
      type: '1:1'
    }
  }

  defineSeparators('workspaceSettings', twoPanelsSeparators)
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={settings.icon.Relations} label={core.string.Relations} size={'large'} isCurrent />
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
        {#each associations as association (association._id)}
          <button
            class="list-item"
            class:selected={selected === association}
            on:click={() => {
              selected = association
            }}
          >
            <span class="font-regular-14 overflow-label">{association.nameA} - {association.nameB}</span>
          </button>
        {/each}
      </div>
    </div>
    <Separator name={'workspaceSettings'} index={0} color={'var(--theme-divider-color)'} />
    {#if selected !== undefined}
      <AssociationEditor
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
