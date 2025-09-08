<script lang="ts">
  import { getClient, SpaceSelector } from '@hcengineering/presentation'
  import { ModernButton, ModernEditbox, ButtonIcon, IconSend, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import CreateCardPopup from './CreateCardPopup.svelte'
  import card from '../plugin'
  import { TypeSelector } from '../index'
  import core, { Data, Ref } from '@hcengineering/core'
  import { Card, type CardSpace, MasterTag } from '@hcengineering/card'
  import { getResource } from '@hcengineering/platform'
  import { EmptyMarkup } from '@hcengineering/text'
  import { createCard } from '../utils'

  const dispatch = createEventDispatcher()

  let title: string = ''
  let space: Ref<CardSpace> | undefined = undefined
  let type: Ref<MasterTag> = 'chat:masterTag:Thread' as Ref<MasterTag>

  let creating = false
  $: applyDisabled = title.trim() === '' || space == null || type == null || creating

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: extension =
    type != null
      ? client
        .getModel()
        .findAllSync(card.mixin.CreateCardExtension, {})
        .find((it) => hierarchy.isDerived(type, it._id))
      : undefined

  function onExtend (): void {
    showPopup(
      CreateCardPopup,
      { title, type, space, changeType: true, allowChangeSpace: true },
      'center',
      async (result) => {
        if (result !== undefined) {
          const doc = await getClient().findOne(card.class.Card, { _id: result })
          if (doc === undefined) return
          dispatch('selectCard', doc)
        }
      }
    )
    title = ''
  }

  async function okAction (): Promise<void> {
    if (space === undefined || type == null || title.trim() === '') return

    try {
      creating = true

      const data: Partial<Data<Card>> = {
        title
      }

      if (extension?.canCreate !== undefined) {
        const fn = await getResource(extension.canCreate)
        const res = await fn(space, data)
        if (res === false) {
          return
        } else if (typeof res === 'string') {
          return
        }
      }

      const createdCard = await createCard(type, space, data, EmptyMarkup)
      if (createdCard != null) {
        dispatch('selectCard', createdCard)
      }
      title = ''
    } finally {
      creating = false
    }
  }
</script>

<div class="create-card rounded-form">
  <div class="corner-container">
    <ButtonIcon
      icon={card.icon.Expand}
      size="extra-small"
      on:click={onExtend}
      kind="tertiary"
      disabled={creating}
      tooltip={{ label: card.string.AdvancedCreateCard }}
    />
  </div>
  <div class="form-row">
    <ModernEditbox
      bind:value={title}
      label={card.string.CardTitle}
      size="medium"
      kind="ghost"
      width="100%"
      disabled={creating}
      autoFocus={true}
      on:keydown={(evt) => {
        if (evt.key === 'Enter') {
          void okAction()
        }
      }}
    />
  </div>
  <div class="form-row form-row-bottom">
    <div class="form-dropdowns">
      <SpaceSelector
        _class={card.class.CardSpace}
        query={{ archived: false }}
        label={core.string.Space}
        bind:space
        focus={false}
        readonly={creating}
        kind={'regular'}
        size={'small'}
      />
      <TypeSelector size={'small'} bind:value={type} disabled={creating} />
    </div>
    <ModernButton
      label={card.string.Post}
      icon={IconSend}
      iconSize="small"
      size="small"
      kind="primary"
      disabled={applyDisabled}
      loading={creating}
      on:click={okAction}
    />
  </div>
</div>

<style lang="scss">
  .corner-container {
    position: absolute;
    top: 0.75rem;
    right: 1rem;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    pointer-events: auto;
  }
  .create-card {
    display: flex;
    flex-direction: column;
    width: 100%;
    margin: 1rem 0;
    border-radius: 1rem;
    border: 1px solid var(--theme-divider-color);
    background: var(--theme-surface-color);
    box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.04);
    padding: 1rem;
    position: relative;
  }
  .rounded-form {
    border-radius: 1rem;
  }
  .form-row {
    display: flex;
    width: 100%;
    margin-bottom: 1rem;
  }
  .form-row-bottom {
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0;
    gap: 1rem;
  }
  .form-dropdowns {
    display: flex;
    gap: 0.75rem;
    flex: 1;
  }
</style>
