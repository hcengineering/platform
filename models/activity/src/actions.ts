import type { Builder } from '@hcengineering/model'
import view, { createAction } from '@hcengineering/model-view'

import activity from './plugin'

export function buildActions (builder: Builder): void {
  createAction(
    builder,
    {
      action: activity.actionImpl.AddReaction,
      label: activity.string.AddReaction,
      icon: activity.icon.Emoji,
      input: 'focus',
      category: activity.category.Activity,
      target: activity.class.ActivityMessage,
      inline: true,
      context: {
        mode: 'context',
        group: 'edit'
      }
    },
    activity.ids.AddReactionAction
  )

  createAction(
    builder,
    {
      action: activity.actionImpl.SaveForLater,
      label: activity.string.SaveForLater,
      icon: activity.icon.Bookmark,
      input: 'focus',
      inline: true,
      actionProps: {
        size: 'x-small'
      },
      category: activity.category.Activity,
      target: activity.class.ActivityMessage,
      visibilityTester: activity.function.CanSaveForLater,
      context: {
        mode: 'context',
        group: 'edit'
      }
    },
    activity.ids.SaveForLaterAction
  )

  createAction(
    builder,
    {
      action: activity.actionImpl.RemoveFromSaved,
      label: activity.string.RemoveFromLater,
      icon: activity.icon.BookmarkFilled,
      input: 'focus',
      inline: true,
      actionProps: {
        iconProps: {
          fill: 'var(--global-accent-TextColor)'
        }
      },
      category: activity.category.Activity,
      target: activity.class.ActivityMessage,
      visibilityTester: activity.function.CanRemoveFromSaved,
      context: {
        mode: 'context',
        group: 'edit'
      }
    },
    activity.ids.RemoveFromLaterAction
  )

  createAction(
    builder,
    {
      action: activity.actionImpl.PinMessage,
      label: view.string.Pin,
      icon: view.icon.Pin,
      input: 'focus',
      inline: true,
      category: activity.category.Activity,
      target: activity.class.ActivityMessage,
      visibilityTester: activity.function.CanPinMessage,
      context: {
        mode: 'context',
        group: 'edit'
      }
    },
    activity.ids.PinMessageAction
  )

  createAction(
    builder,
    {
      action: activity.actionImpl.UnpinMessage,
      label: view.string.Unpin,
      icon: view.icon.Pin,
      input: 'focus',
      inline: true,
      actionProps: {
        iconProps: {
          fill: 'var(--global-accent-TextColor)'
        }
      },
      category: activity.category.Activity,
      target: activity.class.ActivityMessage,
      visibilityTester: activity.function.CanUnpinMessage,
      context: {
        mode: 'context',
        group: 'edit'
      }
    },
    activity.ids.UnpinMessageAction
  )
}
