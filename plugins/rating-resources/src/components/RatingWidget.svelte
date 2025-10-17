<script lang="ts">
  import { getCurrentAccount, groupByArray, SortingOrder, type Class, type Doc, type Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import rating, { ReactionKind, type DocReaction } from '@hcengineering/rating'
  import { NavGroup, Label } from '@hcengineering/ui'
  import ScrollBox from '@hcengineering/ui/src/components/ScrollBox.svelte'
  import NavigatorRating from './NavigatorRating.svelte'

  const current = getCurrentAccount()

  const query = createQuery()

  let reactions: DocReaction[] = []

  query.query(
    rating.class.DocReaction,
    {
      createdBy: { $in: current.socialIds }
    },
    (results) => {
      reactions = results
    },
    { limit: 5000, sort: { modifiedOn: SortingOrder.Descending } }
  )

  function groupReactions (reactions: DocReaction[]): {
    _class: Ref<Class<Doc>>
    objects: {
      _id: Ref<Doc>
      reactions: DocReaction[]
    }[]
  }[] {
    const starred = new Set(
      reactions.filter((it) => it.reactionType === ReactionKind.Star && it.value === 1).map((it) => it.attachedTo)
    )

    const validReactions = reactions.filter(
      (it) => it.attachedTo != null && it.attachedToClass != null && starred.has(it.attachedTo)
    )

    // I need to filter reactions without star's

    const byBaseClass = groupByArray(validReactions, (it) => it.attachedToClass)
    return Array.from(byBaseClass.entries()).map(([baseClass, reactions]) => {
      const byDoc = Array.from(groupByArray(reactions, (it) => it.attachedTo)).map((it) => ({
        _id: it[0],
        reactions: it[1]
      }))
      return {
        _class: baseClass,
        objects: byDoc
      }
    })
  }

  $: groupped = groupReactions(reactions)

  $: isEmpty = groupped.length === 0 || groupped.every((g) => g.objects.length === 0)
</script>

<div class="mt-2" />
{#if isEmpty}
  <div class="p-4 text-center content-dark-color h-full w-full flex-grow" style:align-content="center">
    <Label label={rating.string.RatingWidgetEmpty} />
  </div>
{:else}
  <ScrollBox vertical>
    {#each groupped as group}
      {@const classifier = getClient().getHierarchy().findClass(group._class)}
      {#if classifier !== undefined}
        <NavGroup
          _id={group._class}
          categoryName={'features'}
          label={classifier.label}
          type="nested"
          isFold
          empty={group.objects.length === 0}
          noDivider
        >
          <div class="ml-2 mr-2">
            <NavigatorRating _class={classifier} docs={group.objects} />
          </div>
        </NavGroup>
      {/if}
    {/each}
  </ScrollBox>
{/if}
