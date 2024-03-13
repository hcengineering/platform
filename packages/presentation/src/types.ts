import {
  type Class,
  type Client,
  type Doc,
  type DocData,
  type DocumentQuery,
  type Mixin,
  type Ref,
  type RelatedDocument,
  type Space,
  type TxOperations
} from '@hcengineering/core'
import { type Asset, type IntlString, type Resource } from '@hcengineering/platform'
import { type AnyComponent, type AnySvelteComponent, type ComponentExtensionId } from '@hcengineering/ui'

export * from './components/breadcrumbs/types'

/**
 * @public
 */
export interface ObjectSearchResult {
  doc: Doc
  component?: AnySvelteComponent
  componentProps?: any
  title: string
  icon?: Asset | AnySvelteComponent
  iconProps?: any
}

/**
 * @public
 */
export interface ObjectCreate {
  component: AnyComponent
  props?: Record<string, any>
  label: IntlString
  update?: (doc: Doc) => string
}

/**
 * @public
 *
 * Allow to map presentation from query or set of previously found values
 */
export type ObjectSearchFactory = (
  client: Client,
  query: string,
  options?: {
    in?: RelatedDocument[]
    nin?: RelatedDocument[]
  }
) => Promise<ObjectSearchResult[]>

/**
 * @public
 *  search - show in search popup
 *  mention - show in mentions
 */
export type ObjectSearchContext = 'search' | 'mention' | 'spotlight'

/**
 * @public
 */
export interface ObjectSearchCategory extends Doc {
  label: IntlString
  icon: Asset
  title: IntlString
  context: ObjectSearchContext[]

  // Query for documents with pattern
  query: Resource<ObjectSearchFactory>
  classToSearch?: Ref<Class<Doc>>
}

export interface ComponentExt {
  component: AnyComponent
  props?: Record<string, any>
  order?: number // Positioning of elements, into groups.
}

/**
 * @public
 *
 * An component extension to various places of platform.
 */
export interface ComponentPointExtension extends Doc, ComponentExt {
  // Extension point we should extend.
  extension: ComponentExtensionId
}

export type DocCreatePhase = 'pre' | 'post'

/**
 * @public
 */
export type DocCreateFunction = (
  client: TxOperations,
  id: Ref<Doc>,
  space: Space,
  document: DocData<Doc>,

  extraData: Record<string, any>,

  phase: DocCreatePhase
) => Promise<void>

/**
 * @public
 */
export type CreateExtensionKind = 'header' | 'title' | 'body' | 'footer' | 'pool' | 'buttons' | 'createButton'

/**
 * @public
 *
 * Customization for document creation
 *
 * Allow to customize create document/move issue dialogs, in case of selecting project of special kind.
 */
export interface DocCreateExtension extends Doc {
  ofClass: Ref<Class<Doc>>

  components: Partial<Record<CreateExtensionKind, AnyComponent>>
  apply: Resource<DocCreateFunction>
}

export interface DocAttributeRule {
  // A field name
  field: string

  // If document is matched, rule will be used.
  query: DocumentQuery<Doc>

  // If specified, will check for mixin to exists and cast to it
  mixin?: Ref<Mixin<Doc>>

  // If specified, should be applied to field value queries, if field is reference to some document.
  fieldQuery?: DocumentQuery<Doc>
  // If specified will fill document properties to fieldQuery
  fieldQueryFill?: Record<string, string>

  // If specified, should disable unset of field value.
  disableUnset?: boolean

  // If specified should disable edit of this field value.
  disableEdit?: boolean

  // In case of conflict values for multiple documents, will not be applied
  // Or will continue processing
  allowConflict?: boolean
}

/**
 * A configurable rule's for some type of document
 */
export interface DocRules extends Doc {
  // Could be mixin, will be applied if mixin will be set for document.
  ofClass: Ref<Class<Doc>>

  // attribute modification rules
  fieldRules: DocAttributeRule[]

  // Check if document create is allowed for project based on query.
  createRule?: {
    // If query matched, document create is disallowed.
    disallowQuery: DocumentQuery<Space>
    mixin?: Ref<Mixin<Space>>
  }
}
