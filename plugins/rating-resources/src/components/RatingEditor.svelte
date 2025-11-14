<script lang="ts">
  import type { Class, Doc, Ref } from '@hcengineering/core'
  import core, { getCurrentAccount, groupByArray } from '@hcengineering/core'
  import emojiPlugin from '@hcengineering/emoji'
  import { translateCB, getEmbeddedLabel } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import type { DocReaction } from '@hcengineering/rating'
  import ratingPlugin, { ReactionKind } from '@hcengineering/rating'
  import { Button, showPopup } from '@hcengineering/ui'
  import ReactionPresenter from './ReactionPresenter.svelte'

  export let _id: Ref<Doc>
  export let _class: Ref<Class<Doc>>
  export let showMy = true

  export let reactions: DocReaction[] = []

  let _reactions = reactions

  // Compute reaction groups
  $: starReactions = _reactions.filter((r) => r.reactionType === ReactionKind.Star)
  $: otherReactions = groupByArray(
    _reactions.filter((r) => r.reactionType === ReactionKind.Emoji),
    (it) => it.emoji ?? ''
  ).entries()
  $: starCount = starReactions.filter((it) => it.value === 1).length

  const account = getCurrentAccount()

  const socialIds = new Set(account.fullSocialIds.map((it) => it._id))

  const client = getClient()
  let loading = true
  let operating = false

  const reactionsQuery = createQuery()
  $: if (reactions.length === 0) {
    loading = true
    reactionsQuery.query(ratingPlugin.class.DocReaction, { attachedTo: _id, attachedToClass: _class }, (result) => {
      _reactions = result
      loading = false
    })
  } else {
    reactionsQuery.unsubscribe()
    _reactions = reactions
  }

  async function addStarReaction (): Promise<void> {
    operating = true
    try {
      const r = !loading
        ? _reactions
        : await client.findAll<DocReaction>(ratingPlugin.class.DocReaction, {
          attachedTo: _id,
          attachedToClass: _class,
          reactionType: ReactionKind.Star
        })
      const existing = r.filter((it) => it.reactionType === ReactionKind.Star && socialIds.has(it.modifiedBy))
      if (existing.length > 0) {
        for (const e of existing) {
          if (e.value === 0) {
            await client.update(e, { value: 1 })
          } else {
            await client.update(e, { value: 0 })
          }
        }
      } else {
        await client.addCollection(ratingPlugin.class.DocReaction, core.space.Workspace, _id, _class, '_reactions', {
          reactionType: ReactionKind.Star,
          value: 1
        })
      }
    } finally {
      operating = false
    }
  }

  async function addEmojiReaction (event: MouseEvent): Promise<void> {
    showPopup(emojiPlugin.component.EmojiPopup, {}, event.target as HTMLElement, async (emoji) => {
      if (emoji?.text === undefined) return

      operating = true
      try {
        const r = !loading
          ? _reactions
          : await client.findAll<DocReaction>(ratingPlugin.class.DocReaction, {
            attachedTo: _id,
            attachedToClass: _class,
            reactionType: ReactionKind.Emoji,
            text: emoji.text
          })

        const existing = r.filter(
          (it) => it.reactionType === ReactionKind.Emoji && it.emoji === emoji.text && socialIds.has(it.modifiedBy)
        )
        if (existing.length > 0) {
          for (const e of existing) {
            await client.remove(e)
          }
        } else {
          await client.addCollection(ratingPlugin.class.DocReaction, core.space.Workspace, _id, _class, '_reactions', {
            reactionType: ReactionKind.Emoji,
            value: 0,
            emoji: emoji.text,
            image: emoji.image
          })
        }
      } finally {
        operating = false
      }
    })
  }

  async function existingReactionClick (reactions: DocReaction[]): Promise<void> {
    let removed = false
    for (const reaction of reactions) {
      if (account.fullSocialIds.some((it) => it._id === reaction.modifiedBy)) {
        await client.removeDoc(reaction._class, reaction.space, reaction._id)
        removed = true
      }
    }
    if (!removed && reactions.length > 0) {
      // I just want to add my reaction
      await client.addCollection(ratingPlugin.class.DocReaction, core.space.Workspace, _id, _class, '_reactions', {
        reactionType: ReactionKind.Emoji,
        value: 0,
        emoji: reactions[0].emoji,
        image: reactions[0].image
      })
    }
  }

  $: hasSelectedStar = _reactions.some(
    (it) => it.reactionType === ReactionKind.Star && socialIds.has(it.createdBy ?? it.modifiedBy) && it.value === 1
  )

  let addStarAria: string | undefined = undefined
  $: translateCB(ratingPlugin.string.AddStarAria, {}, undefined, (r) => (addStarAria = r))
</script>

<div class="rating-editor">
  <!-- Inline Reactions -->
  <div class="reactions-container">
    <!-- Star Reactions (Premium) -->
    <Button
      icon={hasSelectedStar ? ratingPlugin.icon.StarYellow : ratingPlugin.icon.Rating}
      on:click={addStarReaction}
      kind={'ghost'}
      size={'small'}
      disabled={operating}
      showTooltip={{ label: ratingPlugin.string.AddStar }}
      label={showMy && starCount > 0 ? getEmbeddedLabel(starCount.toString()) : undefined}
    />
    <!-- Other Emoji Reactions -->
    {#each otherReactions as oreact (oreact[0])}
      {@const emoji = oreact[1][0].emoji}
      {@const data = oreact[1]}

      <ReactionPresenter
        {emoji}
        selected={showMy && data.some((it) => socialIds.has(it.modifiedBy))}
        socialIds={data.map((it) => it.modifiedBy)}
        count={showMy ? data.length : 0}
        on:click={() => existingReactionClick(oreact[1])}
      />
    {/each}

    <!-- Add Emoji Reaction Button -->
    <ReactionPresenter icon={emojiPlugin.icon.EmojiAdd} iconSize="small" active={true} on:click={addEmojiReaction} />
  </div>
</div>

<style lang="scss">
  .rating-editor {
    display: flex;
    align-items: center;
    gap: 0.15rem;
    padding: 0.1rem;
    background: transparent;
    border-radius: 0;
    border: none;
  }

  .reactions-container {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-wrap: nowrap;
  }

  .reaction-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    background: transparent;
    border: 1px solid var(--button-secondary-BorderColor);
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 0.9rem;
    flex-shrink: 0;
    min-height: 1.5rem;
    gap: 0.25rem;

    &:hover {
      background: var(--button-secondary-hover-BackgroundColor);
      transform: scale(1.1);
    }

    &:active {
      transform: scale(0.95);
    }
  }

  .star-reaction {
    @extend .reaction-btn;
  }

  .star-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .star-count {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--global-primary-TextColor);
    min-width: 0.75rem;
    text-align: center;
  }

  .reaction-item {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    cursor: pointer;
    transition: all 0.15s ease;
    flex-shrink: 0;

    &:hover {
      transform: scale(1.15);
    }
  }

  .reaction-emoji {
    font-size: 0.9rem;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .reaction-remove {
    position: absolute;
    top: -0.35rem;
    right: -0.35rem;
    width: 0.9rem;
    height: 0.9rem;
    padding: 0;
    background: #ff4444;
    color: white;
    border: none;
    border-radius: 50%;
    font-size: 0.5rem;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.1s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);

    &:hover {
      transform: scale(1.15);
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
    }

    &:active {
      transform: scale(0.9);
    }
  }

  .add-reaction-btn {
    @extend .reaction-btn;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    border-radius: 50%;
  }
</style>
