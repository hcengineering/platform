import { Client, Doc, RelatedDocument } from '@hcengineering/core'
import { Asset, IntlString, Resource } from '@hcengineering/platform'
import { AnyComponent, AnySvelteComponent, ComponentExtensionId } from '@hcengineering/ui'

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
  filter?: { in?: RelatedDocument[], nin?: RelatedDocument[] }
) => Promise<ObjectSearchResult[]>

/**
 * @public
 */
export interface ObjectSearchCategory extends Doc {
  label: IntlString
  icon: Asset

  // Query for documents with pattern
  query: Resource<ObjectSearchFactory>
}

/**
 * @public
 *
 * An component extension to various places of platform.
 */
export interface ComponentPointExtension extends Doc {
  // Extension point we should extend.
  extension: ComponentExtensionId

  // Component to be instantiated with at least following properties:
  // size: 'tiny' | 'small' | 'medium' | 'large'
  component: AnyComponent

  // Extra properties to be passed to the component
  props?: Record<string, any>

  order?: number // Positioning of elements, into groups.
}
