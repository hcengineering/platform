import { type Asset, type IntlString, type Resource } from '@hcengineering/platform'
import { type Account, type Doc, type Markup, type Ref } from '@hcengineering/core'
import type { AnySvelteComponent } from '@hcengineering/ui'
import { type RelativePosition } from 'yjs'
import { type Content, type Editor, type SingleCommands } from '@tiptap/core'
import { type ParseOptions } from '@tiptap/pm/model'

/**
 * @public
 */
export interface TextEditorHandler {
  insertText: (html: string) => void
  insertMarkup: (markup: Markup) => void
  insertTemplate: (name: string, markup: string) => void
  insertTable: (options: { rows?: number, cols?: number, withHeaderRow?: boolean }) => void
  insertCodeBlock: (pos?: number) => void
  insertSeparatorLine: () => void
  insertContent: (
    value: Content,
    options?: {
      parseOptions?: ParseOptions
      updateSelection?: boolean
    }
  ) => void
  focus: () => void
}
/**
 * @public
 */
export type RefInputAction = (element: HTMLElement, editor: TextEditorHandler, event?: MouseEvent) => void
/**
 * A contribution to reference input control, to allow to add more actions to it.
 * @public
 */
export interface RefInputActionItem extends Doc {
  label: IntlString
  icon: Asset

  // Query for documents with pattern
  action: Resource<RefInputAction>

  order?: number
}

/**
 * @public
 */
export enum TextFormatCategory {
  Heading = 'heading',
  TextDecoration = 'text-decoration', // bold, italic, strike, underline
  Link = 'link',
  List = 'list', // orderedList, bulletList,
  Quote = 'quote', // blockquote
  Code = 'code', // code, codeBlock
  Table = 'table'
}

/**
 * @public
 */
export const CollaborationIds = {
  Doc: 'text-editor.collaborator.document',
  Provider: 'text-editor.collaborator.provider'
}

export interface RefAction {
  label: IntlString
  icon: Asset | AnySvelteComponent
  action: RefInputAction
  order: number
  fill?: string
  disabled?: boolean
}

export interface TextNodeAction {
  id: string
  label?: IntlString
  icon: Asset | AnySvelteComponent
  action: (params: { editor: Editor }) => Promise<void> | void
}

/**
 * @public
 */
export interface Heading {
  id: string
  level: number
  title: string
}

/**
 * @public
 */
export interface TextEditorCommandProps {
  editor: Editor
  commands: SingleCommands
}

/**
 * @public
 */
export type TextEditorCommand = (props: TextEditorCommandProps) => boolean

/**
 * @public
 */
export interface TextEditorCommandHandler {
  command: (command: TextEditorCommand) => boolean
  chain: (...commands: TextEditorCommand[]) => boolean
}

/** @public */
export interface CollaborationUser {
  id: Ref<Account>
  name: string
  email: string
  color: number
}

/** @public */
export interface CollaborationUserState {
  clientId: number
  user: CollaborationUser
  cursor?: {
    anchor: RelativePosition
    head: RelativePosition
  } | null
  lastUpdate?: number
}

/** @public */
export interface AwarenessChangeEvent {
  states: CollaborationUserState[]
}
