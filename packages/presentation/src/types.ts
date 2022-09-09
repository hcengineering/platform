import { Client, Doc, RelatedDocument } from '@anticrm/core'
import { Asset, IntlString, Resource } from '@anticrm/platform'
import { AnyComponent, AnySvelteComponent } from '@anticrm/ui'

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
