//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import core, {
  type AnyAttribute,
  type Class,
  type Client,
  type Doc,
  type DocumentQuery,
  type Hierarchy,
  type Ref,
  type PersonId,
  concatLink,
  getDisplayTime,
  getObjectValue
} from '@hcengineering/core'
import { translate, type IntlString, getMetadata } from '@hcengineering/platform'
import { addNotification, NotificationSeverity, locationToUrl, getCurrentResolvedLocation } from '@hcengineering/ui'
import { getCurrentLanguage } from '@hcengineering/theme'
import viewPlugin, {
  type Viewlet,
  type AttributeModel,
  type BuildModelKey,
  type BuildMarkdownTableMetadata,
  type TableMetadata
} from '@hcengineering/view'
import presentation, { getClient } from '@hcengineering/presentation'
import { getName, getPersonByPersonId } from '@hcengineering/contact'
import { buildModel, buildConfigLookup, getAttributeValue, getObjectLinkFragment } from './utils'
import view from './plugin'
import SimpleNotification from './components/SimpleNotification.svelte'
import { copyMarkdown } from './actionImpl'

/**
 * Value formatter function for custom field extraction
 * @param attr - The attribute model
 * @param card - The document object
 * @param hierarchy - The hierarchy instance
 * @param _class - The document class
 * @param language - Current language
 * @returns The formatted value, or undefined if this formatter doesn't apply
 */
export type ValueFormatter = (
  attr: AttributeModel,
  card: Doc,
  hierarchy: Hierarchy,
  _class: Ref<Class<Doc>>,
  language: string | undefined
) => Promise<string | undefined>

/**
 * Registry for value formatters by document class
 * Plugins can register custom formatters for specific document classes
 */
const valueFormattersByClass = new Map<Ref<Class<Doc>>, ValueFormatter[]>()

/**
 * Global formatters (checked for all classes)
 */
const globalValueFormatters: ValueFormatter[] = []

/**
 * Register a value formatter for a specific document class
 * @param _class - The document class this formatter applies to
 * @param formatter - The formatter function to register
 */
export function registerValueFormatterForClass (_class: Ref<Class<Doc>>, formatter: ValueFormatter): void {
  const formatters = valueFormattersByClass.get(_class) ?? []
  formatters.push(formatter)
  valueFormattersByClass.set(_class, formatters)
}

/**
 * Register a global value formatter (applies to all classes)
 * @param formatter - The formatter function to register
 * @deprecated Use registerValueFormatterForClass for better performance and explicit class association
 */
export function registerValueFormatter (formatter: ValueFormatter): void {
  globalValueFormatters.push(formatter)
}

/**
 * Get formatters for a specific class (including parent classes)
 */
function getFormattersForClass (hierarchy: Hierarchy, _class: Ref<Class<Doc>>): ValueFormatter[] {
  const formatters: ValueFormatter[] = []

  // Get formatters for this class and all parent classes
  let currentClass: Ref<Class<Doc>> | undefined = _class
  while (currentClass !== undefined) {
    const classFormatters = valueFormattersByClass.get(currentClass)
    if (classFormatters !== undefined) {
      formatters.push(...classFormatters)
    }
    const classDef: Class<Doc> | undefined = hierarchy.getClass(currentClass)
    currentClass = classDef?.extends
  }

  // Add global formatters
  formatters.push(...globalValueFormatters)

  return formatters
}

enum DocumentAttributeKey {
  CreatedBy = 'createdBy',
  CreatedOn = 'createdOn',
  ModifiedBy = 'modifiedBy',
  ModifiedOn = 'modifiedOn',
  Title = 'title',
  Name = 'name'
}

enum DateFormatOption {
  Numeric = 'numeric',
  Short = 'short'
}

async function buildTableModel (
  client: Client,
  hierarchy: Hierarchy,
  _class: Ref<Class<Doc>>,
  viewlet: Viewlet | undefined
): Promise<AttributeModel[]> {
  if (viewlet !== undefined) {
    const preferences = await client.findAll(viewPlugin.class.ViewletPreference, {
      space: core.space.Workspace,
      attachedTo: viewlet._id
    })
    const config = preferences.length > 0 && preferences[0].config.length > 0 ? preferences[0].config : viewlet.config

    const lookup = buildConfigLookup(hierarchy, _class, config, viewlet.options?.lookup)
    const hiddenKeys = viewlet.configOptions?.hiddenKeys ?? []
    const model = await buildModel({
      client,
      _class,
      keys: config.filter((key: string | BuildModelKey) => {
        if (typeof key === 'string') {
          return !hiddenKeys.includes(key)
        }
        return !hiddenKeys.includes(key.key) && key.displayProps?.grow !== true
      }),
      lookup
    })

    return model.filter((attr) => attr.displayProps?.grow !== true)
  }

  const defaultConfig: Array<string | BuildModelKey> = [
    '', // Object presenter (title)
    DocumentAttributeKey.CreatedBy,
    DocumentAttributeKey.CreatedOn,
    DocumentAttributeKey.ModifiedBy,
    DocumentAttributeKey.ModifiedOn
  ]

  const model = await buildModel({
    client,
    _class,
    keys: defaultConfig,
    lookup: undefined
  })

  return model.filter((attr) => {
    if (
      attr.key === DocumentAttributeKey.CreatedBy ||
      attr.key === DocumentAttributeKey.CreatedOn ||
      attr.key === DocumentAttributeKey.ModifiedBy ||
      attr.key === DocumentAttributeKey.ModifiedOn
    ) {
      return hierarchy.findAttribute(_class, attr.key) !== undefined
    }
    return true
  })
}

/**
 * Check if a string looks like an IntlString (format: plugin:kind:key)
 * Examples: card:string:Card, contact:class:UserProfile, card:types:Document
 * @public
 */
export function isIntlString (value: string): boolean {
  if (typeof value !== 'string' || value.length === 0) {
    return false
  }
  const parts = value.split(':')
  return parts.length >= 3 && parts.every((part) => part.length > 0)
}

async function loadPersonName (
  personId: PersonId,
  hierarchy: Hierarchy,
  userCache?: Map<PersonId, string>
): Promise<string> {
  if (userCache !== undefined) {
    const cachedName = userCache.get(personId)
    if (cachedName !== undefined) {
      return cachedName
    }
  }

  try {
    const client = getClient()
    const person = await getPersonByPersonId(client, personId)
    if (person !== null) {
      const name = getName(hierarchy, person)
      if (userCache !== undefined) {
        userCache.set(personId, name)
      }
      return name
    }
  } catch (error) {
    console.warn('Failed to lookup user name for PersonId:', personId, error)
  }

  return personId
}

/**
 * Loads the actual viewlet configuration, including user preferences
 * @param client - The client instance
 * @param hierarchy - The hierarchy instance
 * @param cardClass - The class to find viewlet for
 * @param propsViewlet - Optional viewlet from props
 * @param propsConfig - Optional config from props
 * @returns The actual config to use, or undefined if no viewlet/config found
 */
async function loadViewletConfig (
  client: Client,
  hierarchy: Hierarchy,
  cardClass: Ref<Class<Doc>>,
  propsViewlet?: Viewlet,
  propsConfig?: Array<string | BuildModelKey>
): Promise<{ viewlet: Viewlet | undefined, config: Array<string | BuildModelKey> | undefined }> {
  // If config is provided directly, use it
  if (propsConfig !== undefined && propsConfig.length > 0) {
    return { viewlet: propsViewlet, config: propsConfig }
  }

  // Find viewlet if not provided
  let viewlet: Viewlet | undefined = propsViewlet
  if (viewlet === undefined) {
    // Search for viewlets attached to this class or any of its ancestor classes
    // Viewlets attached to a parent class apply to child classes
    const allClasses = [cardClass]
    let currentClass = hierarchy.getClass(cardClass)
    while (currentClass?.extends !== undefined) {
      allClasses.push(currentClass.extends)
      currentClass = hierarchy.getClass(currentClass.extends)
    }
    const viewlets = await client.findAll(viewPlugin.class.Viewlet, {
      attachTo: { $in: allClasses },
      descriptor: viewPlugin.viewlet.Table
    })
    // Prefer viewlet attached directly to the class, then parent classes
    viewlet =
      viewlets.find((v) => v.attachTo === cardClass) ??
      viewlets.find((v) => allClasses.includes(v.attachTo)) ??
      viewlets[0]
  }

  // Get user's viewlet preference to use the actual displayed config
  let actualConfig: Array<string | BuildModelKey> | undefined
  if (viewlet !== undefined) {
    const preferences = await client.findAll(viewPlugin.class.ViewletPreference, {
      space: core.space.Workspace,
      attachedTo: viewlet._id
    })
    // Use preference config if available, otherwise fall back to viewlet config
    actualConfig = preferences.length > 0 && preferences[0].config.length > 0 ? preferences[0].config : viewlet.config
  }

  return { viewlet, config: actualConfig }
}

/**
 * Resolve the human-readable label for a custom attribute
 * @param attrLabel - The attribute label (may be an ID like "custom...")
 * @param docClass - The document's class (MasterTag) where the attribute is defined
 * @param hierarchy - The hierarchy instance
 * @param language - Current language
 * @returns The translated human-readable label, or the original label if not found
 */
async function resolveCustomAttributeLabel (
  attrLabel: string,
  docClass: Ref<Class<Doc>>,
  hierarchy: Hierarchy,
  language: string | undefined
): Promise<string> {
  if (!attrLabel.startsWith('custom')) {
    return attrLabel
  }

  // Try to find the attribute on the document's actual class (MasterTag)
  let customAttr = hierarchy.findAttribute(docClass, attrLabel)
  if (customAttr === undefined) {
    const allAttrs = hierarchy.getAllAttributes(docClass)
    customAttr = allAttrs.get(attrLabel)
  }

  if (customAttr?.label !== undefined) {
    // Use the attribute's human-readable label
    return await translate(customAttr.label, {}, language)
  }

  // Fallback to the attribute ID
  return attrLabel
}

/**
 * Generate table headers from AttributeModel array
 * Handles custom attributes, IntlStrings, and regular labels
 * @param model - Array of AttributeModel to generate headers from
 * @param firstDocClass - The first document's class (for custom attribute lookup)
 * @param hierarchy - The hierarchy instance
 * @param language - Current language
 * @returns Array of header strings
 */
async function generateHeaders (
  model: AttributeModel[],
  firstDocClass: Ref<Class<Doc>>,
  hierarchy: Hierarchy,
  language: string | undefined
): Promise<string[]> {
  const headers: string[] = []
  for (const attr of model) {
    let label: string
    if (typeof attr.label === 'string') {
      // Check if this is a custom attribute ID that needs label lookup
      if (attr.label.startsWith('custom')) {
        label = await resolveCustomAttributeLabel(attr.label, firstDocClass, hierarchy, language)
      } else if (isIntlString(attr.label)) {
        label = await translate(attr.label as unknown as IntlString, {}, language)
      } else {
        label = attr.label
      }
    } else {
      label = await translate(attr.label, {}, language)
    }
    headers.push(label)
  }
  return headers
}

/**
 * Convert AttributeModel array back to config format (Array<string | BuildModelKey>)
 * Preserves custom attributes by using label as key when key is empty
 * @param model - Array of AttributeModel to convert
 * @returns Config array that can be used to rebuild the table
 */
function modelToConfig (model: AttributeModel[]): Array<string | BuildModelKey> {
  return model.map((m) => {
    // For custom attributes, key is empty but label contains the attribute name
    if (m.key === '' && typeof m.label === 'string' && m.label.startsWith('custom')) {
      // Return as BuildModelKey to preserve the custom attribute name
      return {
        key: m.label, // Use label (custom attribute name) as key
        label: m.label,
        displayProps: m.displayProps,
        props: m.props,
        sortingKey: m.sortingKey
      }
    }
    // For regular attributes, return the key
    if (m.key !== '') {
      return m.key
    }
    // For empty key attributes (like object presenter), return empty string or BuildModelKey
    if (m.castRequest !== undefined) {
      return {
        key: m.key,
        label: m.label,
        displayProps: m.displayProps,
        props: m.props,
        sortingKey: m.sortingKey
      }
    }
    return m.key
  })
}

/**
 * Format an array of values, handling reference lookups if needed
 * @param value - The array value
 * @param attrType - The attribute type
 * @param attribute - The attribute definition (for getting the name)
 * @param attrKey - The attribute key (fallback if attribute.name is not available)
 * @param card - The document
 * @param language - Current language
 * @returns Formatted string with comma-separated values
 */
async function formatArrayValue (
  value: any[],
  attrType: any,
  attribute: AnyAttribute | undefined,
  attrKey: string,
  card: Doc,
  language: string | undefined
): Promise<string> {
  // Check if it's an array of references
  const isRefArray =
    attrType?._class === core.class.ArrOf &&
    (attrType as { of?: { _class?: Ref<Class<Doc>> } })?.of?._class === core.class.RefTo

  if (isRefArray && (attribute !== undefined || attrKey !== '')) {
    const cardWithLookup = card as any
    const lookupKey = attribute?.name ?? attrKey
    const lookupData = cardWithLookup.$lookup?.[lookupKey]

    if (lookupData !== undefined && lookupData !== null) {
      const resolvedArray = Array.isArray(lookupData) ? lookupData : [lookupData]
      const translatedValues = await Promise.all(
        resolvedArray.map(async (v) => {
          if (typeof v === 'object' && v !== null && 'title' in v) {
            const title = v.title ?? ''
            if (typeof title === 'string' && isIntlString(title)) {
              return await translate(title as unknown as IntlString, {}, language)
            }
            return String(title)
          }
          return typeof v === 'string' ? v : String(v)
        })
      )
      return translatedValues.join(', ')
    }
  }

  // Handle regular arrays (strings, objects with title, etc.)
  const translatedValues = await Promise.all(
    value.map(async (v) => {
      if (typeof v === 'object' && v !== null && 'title' in v) {
        const title = v.title ?? ''
        if (typeof title === 'string' && isIntlString(title)) {
          return await translate(title as unknown as IntlString, {}, language)
        }
        return String(title)
      }
      if (typeof v === 'string' && isIntlString(v)) {
        return await translate(v as unknown as IntlString, {}, language)
      }
      return typeof v === 'string' ? v : String(v)
    })
  )
  return translatedValues.join(', ')
}

/**
 * Extract title or name from an object, translating if needed
 * @param obj - The object to extract from
 * @param language - Current language
 * @returns The title/name string, or empty string if not found
 */
async function extractObjectTitleOrName (obj: Record<string, any>, language: string | undefined): Promise<string> {
  if ('title' in obj) {
    const title = String(obj.title ?? '')
    if (isIntlString(title)) {
      return await translate(title as unknown as IntlString, {}, language)
    }
    return title
  }
  if ('name' in obj) {
    const name = String(obj.name ?? '')
    if (isIntlString(name)) {
      return await translate(name as unknown as IntlString, {}, language)
    }
    return name
  }
  return ''
}

/**
 * Format a custom attribute value for markdown display
 * Handles various types: string, number, boolean, arrays, references
 */
async function formatCustomAttributeValue (
  value: any,
  attribute: AnyAttribute | undefined,
  card: Doc,
  hierarchy: Hierarchy,
  language: string | undefined
): Promise<string> {
  if (value === null || value === undefined) {
    return ''
  }

  const attrType = attribute?.type

  // Handle timestamps
  if (typeof value === 'number' && attrType?._class === core.class.TypeTimestamp) {
    return getDisplayTime(value)
  }

  // Handle dates
  if (value instanceof Date) {
    const options: Intl.DateTimeFormatOptions = {
      year: DateFormatOption.Numeric,
      month: DateFormatOption.Short,
      day: DateFormatOption.Numeric
    }
    return value.toLocaleDateString(language ?? 'default', options)
  }

  // Handle numbers and booleans
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  // Handle strings
  if (typeof value === 'string') {
    // Check if it's an IntlString that needs translation
    if (isIntlString(value)) {
      return await translate(value as unknown as IntlString, {}, language)
    }

    // Check if it's a reference ID - try to resolve from $lookup
    const isRef = attrType?._class === core.class.RefTo
    if (isRef && attribute !== undefined) {
      const cardWithLookup = card as any
      const lookupData = cardWithLookup.$lookup?.[attribute.name]
      if (lookupData !== undefined && lookupData !== null) {
        if (typeof lookupData === 'object' && 'title' in lookupData) {
          const title = lookupData.title ?? ''
          if (typeof title === 'string' && isIntlString(title)) {
            return await translate(title as unknown as IntlString, {}, language)
          }
          return String(title)
        }
      }
    }

    return value
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return await formatArrayValue(value, attrType, attribute, attribute?.name ?? '', card, language)
  }

  // Handle objects (try to get title or name)
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, any>
    const titleOrName = await extractObjectTitleOrName(obj, language)
    return titleOrName !== '' ? titleOrName : String(value)
  }

  return String(value)
}

async function formatValue (
  attr: AttributeModel,
  card: Doc,
  hierarchy: Hierarchy,
  _class: Ref<Class<Doc>>,
  language: string | undefined,
  isFirstColumn: boolean = false,
  userCache?: Map<PersonId, string>,
  customFormatter?: ValueFormatter
): Promise<string> {
  // Try custom formatter first (from actionProps)
  if (customFormatter !== undefined) {
    const formattedValue = await customFormatter(attr, card, hierarchy, _class, language)
    if (formattedValue !== undefined) {
      return formattedValue
    }
  }

  // Try registered value formatters for this class
  const formatters = getFormattersForClass(hierarchy, _class)
  for (const formatter of formatters) {
    const formattedValue = await formatter(attr, card, hierarchy, _class, language)
    if (formattedValue !== undefined) {
      return formattedValue
    }
  }

  let value: any
  if (attr.castRequest != null) {
    value = getObjectValue(attr.key.substring(attr.castRequest.length + 1), hierarchy.as(card, attr.castRequest))
  } else {
    // Handle lookup keys properly
    if (attr.key.startsWith('$lookup.')) {
      const lookupKey = attr.key.replace('$lookup.', '')
      const lookupParts = lookupKey.split('.')
      const cardWithLookup = card as any
      const lookupObj = cardWithLookup.$lookup?.[lookupParts[0]]
      if (lookupObj !== undefined && lookupObj !== null) {
        if (lookupParts.length > 1) {
          value = getObjectValue(lookupParts.slice(1).join('.'), lookupObj)
        } else {
          value = lookupObj
        }
      } else {
        value = undefined
      }
    } else {
      value = getObjectValue(attr.key, card)
    }
  }

  // Handle custom attributes that failed to build properly in the model
  // These have key: '' but the actual attribute name is in the label
  if (attr.key === '' && !isFirstColumn) {
    const labelStr = typeof attr.label === 'string' ? attr.label : ''
    const isCustomAttribute = labelStr.startsWith('custom')

    if (isCustomAttribute) {
      // Get value directly from document using label as key
      const customValue = (card as any)[labelStr]
      if (customValue === null || customValue === undefined) {
        return ''
      }

      // Try to find the attribute definition on the document's class (MasterTag)
      const docClass = card._class
      let customAttr = hierarchy.findAttribute(docClass, labelStr)

      // If not found on document class, search in all attributes
      if (customAttr === undefined) {
        const allAttrs = hierarchy.getAllAttributes(docClass)
        customAttr = allAttrs.get(labelStr)
      }

      return await formatCustomAttributeValue(customValue, customAttr, card, hierarchy, language)
    }

    // Not a custom attribute with empty key - skip (e.g., object presenter in non-first column)
    return ''
  }

  if (value === null || value === undefined) {
    return ''
  }

  // Use attribute from model if available, otherwise try to find it
  const attribute = attr.attribute ?? hierarchy.findAttribute(_class, attr.key)
  const attrType = attribute?.type

  if (typeof value === 'number' && attrType?._class === core.class.TypeTimestamp) {
    return getDisplayTime(value)
  }

  if (value instanceof Date) {
    const options: Intl.DateTimeFormatOptions = {
      year: DateFormatOption.Numeric,
      month: DateFormatOption.Short,
      day: DateFormatOption.Numeric
    }
    return value.toLocaleDateString(language ?? 'default', options)
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (typeof value === 'string') {
    // Check if this is a single reference ID that needs lookup
    const isRef = attrType?._class === core.class.RefTo
    if (isRef) {
      const cardWithLookup = card as any
      const lookupData = cardWithLookup.$lookup?.[attr.key]
      if (lookupData !== undefined && lookupData !== null) {
        // Use the resolved object
        const resolvedObj = lookupData
        if (typeof resolvedObj === 'object' && resolvedObj !== null && 'title' in resolvedObj) {
          const title = resolvedObj[DocumentAttributeKey.Title] ?? ''
          if (typeof title === 'string' && isIntlString(title)) {
            return await translate(title as unknown as IntlString, {}, language)
          }
          return String(title)
        }
        // Fall through to display as string if no title
      }
    }

    if (isIntlString(value)) {
      return await translate(value as unknown as IntlString, {}, language)
    }
    if (attr.key === DocumentAttributeKey.CreatedBy || attr.key === DocumentAttributeKey.ModifiedBy) {
      return await loadPersonName(value as PersonId, hierarchy, userCache)
    }
    return value
  }

  if (Array.isArray(value)) {
    return await formatArrayValue(value, attrType, attribute, attr.key, card, language)
  }

  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, any>
    const titleOrName = await extractObjectTitleOrName(obj, language)
    return titleOrName !== '' ? titleOrName : String(value)
  }

  return String(value)
}

function escapeMarkdownLinkText (text: string): string {
  // Escape backslashes first, then brackets and pipes, and normalize newlines to spaces
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
}

function escapeMarkdownLinkUrl (url: string): string {
  // Escape backslashes and closing parentheses used to terminate the URL
  return url.replace(/\\/g, '\\\\').replace(/\)/g, '\\)')
}

async function createMarkdownLink (hierarchy: Hierarchy, card: Doc, value: string): Promise<string> {
  try {
    const loc = await getObjectLinkFragment(hierarchy, card, {}, view.component.EditDoc)
    const relativeUrl = locationToUrl(loc)
    const frontUrl =
      getMetadata(presentation.metadata.FrontUrl) ?? (typeof window !== 'undefined' ? window.location.origin : '')
    const fullUrl = concatLink(frontUrl, relativeUrl)
    const escapedText = escapeMarkdownLinkText(value)
    const escapedUrl = escapeMarkdownLinkUrl(fullUrl)
    return `[${escapedText}](${escapedUrl})`
  } catch {
    // If link generation fails, fall back to plain text
    return escapeMarkdownLinkText(value)
  }
}

export interface CopyAsMarkdownTableProps {
  cardClass: Ref<Class<Doc>>
  viewlet?: Viewlet
  config?: Array<string | BuildModelKey>
  valueFormatter?: ValueFormatter
  query?: DocumentQuery<Doc> // Original query used to fetch documents
}

/**
 * Interface for RelationshipTable's row and cell models
 */
export interface RelationshipCellModel {
  attribute: AttributeModel
  rowSpan: number
  object: Doc | undefined
  parentObject: Doc | undefined
}

export interface RelationshipRowModel {
  cells: RelationshipCellModel[]
}

export interface CopyRelationshipTableAsMarkdownProps {
  viewModel: RelationshipRowModel[]
  model: AttributeModel[]
  objects: Doc[]
  cardClass: Ref<Class<Doc>>
  valueFormatter?: ValueFormatter
  query?: DocumentQuery<Doc> // Original query used to fetch documents
}

/**
 * Build metadata object from props and documents
 * If viewlet is not provided, tries to find a default viewlet for the class
 */
async function buildTableMetadata (
  props: CopyAsMarkdownTableProps,
  docs: Doc[],
  client?: Client
): Promise<TableMetadata> {
  // If viewlet is not provided, try to find a default viewlet for the class
  let viewletId: Ref<Viewlet> | undefined = props.viewlet?._id
  if (viewletId === undefined && client !== undefined) {
    const { viewlet } = await loadViewletConfig(client, client.getHierarchy(), props.cardClass, undefined, props.config)
    viewletId = viewlet?._id
  }

  // Capture the original URL of the current page/view
  let originalUrl: string | undefined
  try {
    const currentLocation = getCurrentResolvedLocation()
    const relativeUrl = locationToUrl(currentLocation)
    const frontUrl =
      getMetadata(presentation.metadata.FrontUrl) ?? (typeof window !== 'undefined' ? window.location.origin : '')
    originalUrl = concatLink(frontUrl, relativeUrl)
  } catch (error) {
    // If URL capture fails, continue without it
    console.warn('Failed to capture original URL for table metadata:', error)
  }

  return {
    version: '1.0',
    cardClass: props.cardClass,
    viewletId,
    config: props.config,
    query: props.query,
    documentIds: docs.map((d) => d._id),
    timestamp: Date.now(),
    originalUrl
  }
}

/**
 * Build metadata object for relationship tables
 */
export function buildRelationshipTableMetadata (
  props: CopyRelationshipTableAsMarkdownProps,
  docs: Doc[]
): TableMetadata {
  let originalUrl: string | undefined
  try {
    const currentLocation = getCurrentResolvedLocation()
    const relativeUrl = locationToUrl(currentLocation)
    const frontUrl =
      getMetadata(presentation.metadata.FrontUrl) ?? (typeof window !== 'undefined' ? window.location.origin : '')
    originalUrl = concatLink(frontUrl, relativeUrl)
  } catch (error) {
    console.warn('Failed to capture original URL for relationship table metadata:', error)
  }

  return {
    version: '1.0',
    cardClass: props.cardClass,
    viewletId: undefined, // Relationship tables don't use viewlets
    config: modelToConfig(props.model), // Preserve custom attributes by converting model to config
    query: props.query,
    documentIds: docs.map((d) => d._id),
    timestamp: Date.now(),
    originalUrl
  }
}

/**
 * Wrapper function for building markdown table from BuildMarkdownTableMetadata
 * This is used by text-editor-resources to refresh tables
 * Converts BuildMarkdownTableMetadata format to CopyAsMarkdownTableProps format
 */
export async function buildMarkdownTableFromMetadata (
  docs: Doc[],
  metadata: BuildMarkdownTableMetadata,
  client: Client
): Promise<string> {
  // Load viewlet if viewletId is provided
  let viewlet: Viewlet | undefined
  if (metadata.viewletId !== undefined) {
    viewlet = await client.findOne(viewPlugin.class.Viewlet, { _id: metadata.viewletId as Ref<Viewlet> })
  }

  // Convert metadata to CopyAsMarkdownTableProps
  const props: CopyAsMarkdownTableProps = {
    cardClass: metadata.cardClass as Ref<Class<Doc>>,
    viewlet,
    config: metadata.config,
    query: metadata.query
  }

  // Use the reusable function
  return await buildMarkdownTableFromDocs(docs, props, client)
}

/**
 * Build markdown table string from documents and props
 * This is the core logic for building markdown tables, extracted for reuse
 * @param docs - Documents to include in the table
 * @param props - Table configuration props
 * @param client - Client instance
 * @returns Markdown table string
 */
export async function buildMarkdownTableFromDocs (
  docs: Doc[],
  props: CopyAsMarkdownTableProps,
  client: Client
): Promise<string> {
  if (docs.length === 0) {
    return ''
  }

  const hierarchy = client.getHierarchy()
  const cardClass = hierarchy.getClass(props.cardClass)
  if (cardClass == null) {
    return ''
  }

  // Load viewlet and config (including user preferences)
  const { viewlet, config: actualConfig } = await loadViewletConfig(
    client,
    hierarchy,
    props.cardClass,
    props.viewlet,
    props.config
  )

  // Build displayable model from config
  let displayableModel: AttributeModel[]
  if (actualConfig !== undefined && actualConfig.length > 0) {
    const lookup =
      viewlet !== undefined
        ? buildConfigLookup(hierarchy, props.cardClass, actualConfig, viewlet.options?.lookup)
        : undefined
    const hiddenKeys = viewlet?.configOptions?.hiddenKeys ?? []
    const model = await buildModel({
      client,
      _class: props.cardClass,
      keys: actualConfig.filter((key: string | BuildModelKey) => {
        if (typeof key === 'string') {
          return !hiddenKeys.includes(key)
        }
        return !hiddenKeys.includes(key.key) && key.displayProps?.grow !== true
      }),
      lookup
    })
    displayableModel = model.filter((attr) => attr.displayProps?.grow !== true)
  } else {
    displayableModel = await buildTableModel(client, hierarchy, props.cardClass, viewlet)
  }

  if (displayableModel.length === 0) {
    return ''
  }

  const language = getCurrentLanguage()

  // Cache for user ID (PersonId) -> name mappings to reduce database calls
  const userCache = new Map<PersonId, string>()

  // Get the first document's class for custom attribute lookup
  const firstDocClass = docs.length > 0 ? docs[0]._class : props.cardClass

  // Generate headers using common function
  const headers = await generateHeaders(displayableModel, firstDocClass, hierarchy, language)

  const rows: string[][] = []
  for (const card of docs) {
    const row: string[] = []
    for (let i = 0; i < displayableModel.length; i++) {
      const attr = displayableModel[i]
      const isFirstColumn = i === 0
      const value = await formatValue(
        attr,
        card,
        hierarchy,
        props.cardClass,
        language,
        isFirstColumn,
        userCache,
        props.valueFormatter
      )

      // If this is the first column with empty key (title attribute), create a markdown link
      if (isFirstColumn && attr.key === '') {
        const linkValue = await createMarkdownLink(hierarchy, card, value)
        row.push(linkValue)
      } else {
        const escapedValue = escapeMarkdownLinkText(value)
        row.push(escapedValue)
      }
    }
    rows.push(row)
  }

  let markdown = '| ' + headers.join(' | ') + ' |\n'
  markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n'
  for (const row of rows) {
    markdown += '| ' + row.join(' | ') + ' |\n'
  }

  return markdown
}

export async function CopyAsMarkdownTable (
  doc: Doc | Doc[],
  evt: Event,
  props: CopyAsMarkdownTableProps
): Promise<void> {
  try {
    const docs = Array.isArray(doc) ? doc : doc !== undefined ? [doc] : []
    if (docs.length === 0) {
      return
    }
    const client = getClient()

    // Build markdown table using the extracted function
    const markdown = await buildMarkdownTableFromDocs(docs, props, client)

    if (markdown.length === 0) {
      return
    }

    // Build metadata for table refresh/diff functionality
    const metadata = await buildTableMetadata(props, docs, client)
    await copyMarkdown(markdown, metadata)

    const language = getCurrentLanguage()
    addNotification(
      await translate(view.string.Copied, {}, language),
      await translate(view.string.TableCopiedToClipboard, {}, language),
      SimpleNotification,
      undefined,
      NotificationSeverity.Success
    )
  } catch (error) {
    const language = getCurrentLanguage()
    addNotification(
      await translate(view.string.Copied, {}, language),
      await translate(view.string.TableCopyFailed, {}, language),
      SimpleNotification,
      undefined,
      NotificationSeverity.Error
    )
  }
}

/**
 * Copy RelationshipTable as markdown table
 * Handles hierarchical data with row spans by duplicating cell values across spanned rows
 */
export async function CopyRelationshipTableAsMarkdown (
  evt: Event,
  props: CopyRelationshipTableAsMarkdownProps
): Promise<void> {
  try {
    if (props.viewModel.length === 0 || props.model.length === 0) {
      return
    }

    const client = getClient()
    const hierarchy = client.getHierarchy()
    const cardClass = hierarchy.getClass(props.cardClass)
    if (cardClass == null) {
      return
    }

    const language = getCurrentLanguage()

    // Cache for user ID (PersonId) -> name mappings to reduce database calls
    const userCache = new Map<PersonId, string>()

    // Get the first document's class for custom attribute lookup
    const firstDocClass = props.objects.length > 0 ? props.objects[0]._class : props.cardClass

    // Generate headers using common function
    const headers = await generateHeaders(props.model, firstDocClass, hierarchy, language)

    // Build a map of attribute keys to their index in the model for quick lookup
    const attributeKeyToIndex = new Map<string, number>()
    props.model.forEach((attr, index) => {
      attributeKeyToIndex.set(attr.key, index)
    })

    // Track active row spans - maps attribute key to remaining span count
    const activeRowSpans = new Map<string, { value: string, remaining: number }>()

    // Process rows from viewModel
    const rows: string[][] = []
    for (let rowIdx = 0; rowIdx < props.viewModel.length; rowIdx++) {
      const rowModel = props.viewModel[rowIdx]
      const row: string[] = new Array(headers.length).fill('')

      // First, handle cells that are continuing from previous rows (row spans)
      for (const [attrKey, spanInfo] of activeRowSpans.entries()) {
        if (spanInfo.remaining > 0) {
          const attrIndex = attributeKeyToIndex.get(attrKey)
          if (attrIndex !== undefined) {
            row[attrIndex] = spanInfo.value
            spanInfo.remaining--
            if (spanInfo.remaining === 0) {
              activeRowSpans.delete(attrKey)
            }
          }
        }
      }

      // Then, process cells in the current row
      for (const cell of rowModel.cells) {
        const attrIndex = attributeKeyToIndex.get(cell.attribute.key)
        if (attrIndex === undefined) continue

        // Determine if this is an association column
        const isAssociationKey = cell.attribute.key.startsWith('$associations')

        let doc: Doc | undefined
        if (isAssociationKey) {
          doc = cell.object
        } else {
          doc = cell.object ?? cell.parentObject
        }

        if (doc === undefined) {
          // Empty cell
          row[attrIndex] = ''
          continue
        }

        // Use the same getValue logic as RelationshipTable
        // For association keys, this returns the child document object itself
        const rawValue = getAttributeValue(cell.attribute, doc, hierarchy)

        // Determine which document and class to use for formatting
        let docToUse = doc
        let docClass = props.cardClass
        let attributeToUse = cell.attribute

        if (isAssociationKey) {
          // For association keys, the value IS the child document object
          if (rawValue !== undefined && rawValue !== null && typeof rawValue === 'object' && '_class' in rawValue) {
            docToUse = rawValue as Doc
            docClass = docToUse._class
            const parts = cell.attribute.key.split('$associations.')
            if (parts.length > 1) {
              const afterAssoc = parts[1].substring(1) // Remove leading dot
              const dotIndex = afterAssoc.indexOf('.')
              if (dotIndex > 0) {
                const attributeName = afterAssoc.substring(dotIndex + 1)
                attributeToUse = {
                  ...cell.attribute,
                  key: attributeName
                }
              } else {
                attributeToUse = {
                  ...cell.attribute,
                  key: ''
                }
              }
            }
          }
        }

        // Format the value using the same logic as regular tables
        const isFirstColumn = attrIndex === 0
        const allowEmptyKey = isFirstColumn || isAssociationKey
        let value = await formatValue(
          attributeToUse,
          docToUse,
          hierarchy,
          docClass,
          language,
          allowEmptyKey, // Pass true for association keys so empty key works
          userCache,
          props.valueFormatter
        )

        const isDocumentTitle = attributeToUse.key === '' && docToUse !== undefined
        if (isDocumentTitle) {
          value = await createMarkdownLink(hierarchy, docToUse, value)
        } else {
          value = escapeMarkdownLinkText(value)
        }

        row[attrIndex] = value

        // If this cell has a row span > 1, track it for subsequent rows
        if (cell.rowSpan > 1) {
          activeRowSpans.set(cell.attribute.key, {
            value,
            remaining: cell.rowSpan - 1
          })
        }
      }

      rows.push(row)
    }

    // Build markdown table
    let markdown = '| ' + headers.join(' | ') + ' |\n'
    markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n'
    for (const row of rows) {
      markdown += '| ' + row.join(' | ') + ' |\n'
    }

    // Build metadata for relationship table refresh/diff functionality
    const metadata = buildRelationshipTableMetadata(props, props.objects)
    await copyMarkdown(markdown, metadata)

    addNotification(
      await translate(view.string.Copied, {}, language),
      await translate(view.string.TableCopiedToClipboard, {}, language),
      SimpleNotification,
      undefined,
      NotificationSeverity.Success
    )
  } catch (error) {
    const language = getCurrentLanguage()
    addNotification(
      await translate(view.string.Copied, {}, language),
      await translate(view.string.TableCopyFailed, {}, language),
      SimpleNotification,
      undefined,
      NotificationSeverity.Error
    )
  }
}
