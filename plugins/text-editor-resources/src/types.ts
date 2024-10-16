import { type Asset } from '@hcengineering/platform'
import { type Ref } from '@hcengineering/core'
import { type TextEditorInlineCommand, type TextEditorInlineCommandType } from '@hcengineering/text-editor'

export interface DisplayInlineCommand {
  _id: Ref<TextEditorInlineCommand>
  icon: Asset
  title: string
  description?: string

  command: string
  commandTemplate?: string
  type: TextEditorInlineCommandType
}
