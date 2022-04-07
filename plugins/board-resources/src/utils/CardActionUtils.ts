import { Card } from '@anticrm/board'
import { IconAdd, IconAttachment } from '@anticrm/ui'
import { CardAction, CardActionGroup } from '../models/CardAction'
import board from '../plugin'

export const MembersAction: CardAction = {
  icon: board.icon.Card,
  label: board.string.Members
}

export const LabelsAction: CardAction = {
  icon: board.icon.Card,
  label: board.string.Labels
}

export const ChecklistAction: CardAction = {
  icon: board.icon.Card,
  label: board.string.Checklist
}

export const DatesAction: CardAction = {
  icon: board.icon.Card,
  label: board.string.Dates
}

export const AttachmentsAction: CardAction = {
  icon: IconAttachment,
  label: board.string.Attachments
}

export const CustomFieldsAction: CardAction = {
  icon: board.icon.Card,
  label: board.string.CustomFields
}

export const AddButtonAction: CardAction = {
  icon: IconAdd,
  isTransparent: true,
  label: board.string.AddButton
}

export const MoveAction: CardAction = {
  icon: board.icon.Card,
  label: board.string.Move
}

export const CopyAction: CardAction = {
  icon: board.icon.Card,
  label: board.string.Copy
}

export const MakeTemplateAction: CardAction = {
  icon: board.icon.Card,
  label: board.string.MakeTemplate
}

export const WatchAction: CardAction = {
  icon: board.icon.Card,
  label: board.string.Watch
}

export const ArchiveAction: CardAction = {
  icon: board.icon.Card,
  label: board.string.Archive
}

export const getEditorCardActionGroups = (card: Card): CardActionGroup[] => {
  if (card === undefined) {
    return []
  }

  return [
    {
      label: board.string.AddToCard,
      actions: [MembersAction, LabelsAction, ChecklistAction, DatesAction, AttachmentsAction, CustomFieldsAction]
    },
    {
      label: board.string.Automation,
      actions: [AddButtonAction]
    },
    {
      label: board.string.Actions,
      actions: [MoveAction, CopyAction, MakeTemplateAction, WatchAction, ArchiveAction]
    }
  ]
}
