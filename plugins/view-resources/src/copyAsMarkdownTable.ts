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
  type Class,
  type Client,
  type Doc,
  type Hierarchy,
  type Ref,
  type PersonId,
  concatLink,
  getDisplayTime,
  getObjectValue
} from '@hcengineering/core'
import { translate, type IntlString, getMetadata } from '@hcengineering/platform'
import { addNotification, NotificationSeverity, locationToUrl } from '@hcengineering/ui'
import { getCurrentLanguage } from '@hcengineering/theme'
import viewPlugin, { type Viewlet, type AttributeModel, type BuildModelKey } from '@hcengineering/view'
import presentation, { getClient } from '@hcengineering/presentation'
import { getName, getPersonByPersonId } from '@hcengineering/contact'
import { buildModel, buildConfigLookup, getObjectLinkFragment } from './utils'
import view from './plugin'
import SimpleNotification from './components/SimpleNotification.svelte'
import { copyText } from './actionImpl'

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

async function formatValue (
  attr: AttributeModel,
  card: Doc,
  hierarchy: Hierarchy,
  _class: Ref<Class<Doc>>,
  language: string | undefined,
  isFirstColumn: boolean = false,
  userCache?: Map<PersonId, string>
): Promise<string> {
  let value: any
  if (attr.castRequest != null) {
    value = getObjectValue(attr.key.substring(attr.castRequest.length + 1), hierarchy.as(card, attr.castRequest))
  } else {
    value = getObjectValue(attr.key, card)
  }

  // If this is an empty key but NOT the first column, return empty string
  // (empty key should only be used for the object presenter in the first column)
  if (attr.key === '' && !isFirstColumn) {
    return ''
  }

  if (value === null || value === undefined) {
    return ''
  }

  const attribute = hierarchy.findAttribute(_class, attr.key)
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
    if (isIntlString(value)) {
      return await translate(value as unknown as IntlString, {}, language)
    }
    if (attr.key === DocumentAttributeKey.CreatedBy || attr.key === DocumentAttributeKey.ModifiedBy) {
      return await loadPersonName(value as PersonId, hierarchy, userCache)
    }
    return value
  }

  if (Array.isArray(value)) {
    const translatedValues = await Promise.all(
      value.map(async (v) => {
        if (typeof v === 'object' && v !== null && 'title' in v) {
          const title = v[DocumentAttributeKey.Title] ?? ''
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

  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, any>
    const title = obj[DocumentAttributeKey.Title]
    if (title != null && title !== undefined) {
      const titleStr = String(title)
      if (isIntlString(titleStr)) {
        return await translate(titleStr as unknown as IntlString, {}, language)
      }
      return titleStr
    }
    const name = obj[DocumentAttributeKey.Name]
    if (name != null && name !== undefined) {
      const nameStr = String(name)
      if (isIntlString(nameStr)) {
        return await translate(nameStr as unknown as IntlString, {}, language)
      }
      return nameStr
    }
    return String(value)
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

export async function CopyAsMarkdownTable (
  doc: Doc | Doc[],
  evt: Event,
  props: {
    cardClass: Ref<Class<Doc>>
    viewlet?: Viewlet
    config?: Array<string | BuildModelKey>
  }
): Promise<void> {
  try {
    const docs = Array.isArray(doc) ? doc : doc !== undefined ? [doc] : []
    if (docs.length === 0) {
      return
    }
    const client = getClient()
    const hierarchy = client.getHierarchy()
    const cardClass = hierarchy.getClass(props.cardClass)
    if (cardClass == null) {
      return
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
      return
    }

    const language = getCurrentLanguage()

    // Cache for user ID (PersonId) -> name mappings to reduce database calls
    const userCache = new Map<PersonId, string>()

    const headers: string[] = []
    for (const attr of displayableModel) {
      let label: string
      if (typeof attr.label === 'string') {
        label = isIntlString(attr.label)
          ? await translate(attr.label as unknown as IntlString, {}, language)
          : attr.label
      } else {
        label = await translate(attr.label, {}, language)
      }
      headers.push(label)
    }

    const rows: string[][] = []
    for (const card of docs) {
      const row: string[] = []
      for (let i = 0; i < displayableModel.length; i++) {
        const attr = displayableModel[i]
        const isFirstColumn = i === 0
        const value = await formatValue(attr, card, hierarchy, props.cardClass, language, isFirstColumn, userCache)

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

    await copyText(markdown, 'text/markdown')

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
