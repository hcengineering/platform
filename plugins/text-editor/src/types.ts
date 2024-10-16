import { type Asset, type IntlString, type Resource } from '@hcengineering/platform'
import { type Class, type Space, type Account, type Doc, type Markup, type Ref } from '@hcengineering/core'
import type { AnySvelteComponent } from '@hcengineering/ui/src/types'
import { type RelativePosition } from 'yjs'
import { type AnyExtension, type Content, type Editor, type SingleCommands } from '@tiptap/core'
import { type ParseOptions } from '@tiptap/pm/model'

export type { AnyExtension, Editor } from '@tiptap/core'

/**
 * @public
 */
export type CollaboratorType = 'local' | 'cloud'

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
export type RefInputActionDisabledFn = (editor: Editor, content: Markup) => boolean
/**
 * A contribution to reference input control, to allow to add more actions to it.
 * @public
 */
export interface RefInputActionItem extends Doc {
  label: IntlString
  icon: Asset
  iconProps?: Record<string, any>

  // Query for documents with pattern
  action: Resource<RefInputAction>
  isDisabledFn?: Resource<RefInputActionDisabledFn>

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
  iconProps?: Record<string, any>
  action: RefInputAction
  order: number
  fill?: string
  disabled?: boolean
  disabledFn?: RefInputActionDisabledFn
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
export interface ActionContext {
  mode: TextEditorMode
  objectId?: Ref<Doc>
  objectClass?: Ref<Class<Doc>>
  objectSpace?: Ref<Space>
}

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
export interface AwarenessState {
  user: CollaborationUser
  cursor?: {
    anchor: RelativePosition
    head: RelativePosition
  } | null
  lastUpdate?: number
}

/** @public */
export type AwarenessClientId = number

/** @public */
export type AwarenessStateMap = Map<AwarenessClientId, AwarenessState>

export type TextEditorMode = 'full' | 'compact'
export type ExtensionCreator = (mode: TextEditorMode, ctx: any) => AnyExtension

/**
 * Extension to tiptap document editor
 * @public
 */
export interface TextEditorExtensionFactory extends Doc {
  index: number
  create: Resource<ExtensionCreator>
}

/**
 * Action handler for text editor action
 */
export type TextActionFunction = (editor: Editor, event: MouseEvent, ctx: ActionContext) => Promise<void>

/**
 * Handler to determine whether the text action is visible
 */
export type TextActionVisibleFunction = (editor: Editor, ctx: ActionContext) => Promise<boolean>

/**
 * Handler to determine whether the text action is active
 */
export type TextActionActiveFunction = (editor: Editor) => Promise<boolean>

/**
 * Describes toggle handler for a text action
 */
export interface TogglerDescriptor {
  command: keyof SingleCommands
  params?: any
}

/**
 * Describes isActive handler for a text action
 */
export interface ActiveDescriptor {
  name: string
  params?: any
}

export type TextEditorActionKind = 'text' | 'image'

/**
 * Defines a text action for text action editor
 */
export interface TextEditorAction extends Doc {
  kind?: TextEditorActionKind
  action: TogglerDescriptor | Resource<TextActionFunction>
  visibilityTester?: Resource<TextActionVisibleFunction>
  icon: Asset
  isActive?: ActiveDescriptor | Resource<TextActionActiveFunction>
  label: IntlString
  category: number
  index: number
}

export type TextEditorInlineCommandCategory = 'editor' | 'general'
export type TextEditorInlineCommandType = 'command' | 'shortcut'

export interface InlineCommandEditorHandler {
  editor: TextEditorHandler
  insertImage?: (pos: number, targetItem?: MouseEvent | HTMLElement) => void
  insertTable?: (pos: number, targetItem?: MouseEvent | HTMLElement) => void
  insertCodeBlock?: (pos: number, targetItem?: MouseEvent | HTMLElement) => void
  insertTodoList?: (pos: number, targetItem?: MouseEvent | HTMLElement) => void
  insertSeparatorLine?: (pos: number, targetItem?: MouseEvent | HTMLElement) => void
}

export type InlineCommandAction = (
  markup: Markup,
  context: { objectId: Ref<Doc>, objectClass: Ref<Class<Doc>> }
) => Promise<void>
export type InlineShortcutAction = (
  handler: InlineCommandEditorHandler,
  pos: number,
  targetItem?: MouseEvent | HTMLElement
) => Promise<void>
export type InlineCommandVisibilityTester = () => Promise<boolean>

export interface TextEditorInlineCommand extends Doc {
  icon: Asset
  title: IntlString
  description?: IntlString

  command: string
  commandTemplate?: string

  category: TextEditorInlineCommandCategory
  type: TextEditorInlineCommandType

  action: Resource<InlineCommandAction> | Resource<InlineShortcutAction>
  visibilityTester?: Resource<InlineCommandVisibilityTester>
}
