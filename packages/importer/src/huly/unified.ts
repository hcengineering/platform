// unified.ts
import card, { Card, MasterTag, Tag } from '@hcengineering/card'
import core, {
  Attribute,
  Doc,
  generateId,
  Mixin,
  Ref
} from '@hcengineering/core'
import * as fs from 'fs'
import * as yaml from 'js-yaml'
import * as path from 'path'
import { IntlString } from '../../../platform/types'
import { Props, UnifiedDoc, UnifiedMixin } from '../types'
import { readMarkdownContent, readYamlHeader } from './parsing'

export interface UnifiedDocProcessResult {
  docs: Map<string, Array<UnifiedDoc<Doc>>>
  mixins: Map<string, Array<UnifiedMixin<Doc, Doc>>>
}

export class UnifiedDocProcessor {
  private readonly tagPaths = new Map<string, Ref<Tag>>()

  async importFromDirectory (directoryPath: string): Promise<UnifiedDocProcessResult> {
    const result: UnifiedDocProcessResult = {
      docs: new Map(),
      mixins: new Map()
    }
    await this.processDirectory(directoryPath, result)
    return result
  }

  private async processDirectory (
    currentPath: string,
    result: UnifiedDocProcessResult,
    parentMasterTagId?: Ref<MasterTag>,
    parentAttributesByLabel?: Map<string, UnifiedDoc<Attribute<MasterTag>>>
  ): Promise<void> {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true })

    // Сначала обрабатываем YAML файлы (потенциальные мастер-теги)
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.yaml')) continue // todo: filter entries by extension

      const yamlPath = path.join(currentPath, entry.name)
      const yamlConfig = yaml.load(fs.readFileSync(yamlPath, 'utf8')) as Record<string, any>

      if (yamlConfig?.class === card.class.MasterTag) {
        const masterTag = await this.createMasterTag(yamlConfig, parentMasterTagId)
        const masterTagId = masterTag.props._id as Ref<MasterTag>
        const attributesByLabel = await this.createAttributes(yamlConfig, masterTagId)

        // Add master tag and its attributes
        const docs = result.docs.get(yamlPath) ?? []
        docs.push(
          masterTag,
          ...Array.from(attributesByLabel.values())
        )
        result.docs.set(yamlPath, docs)

        // Recursively process the master tag directory
        const masterTagDir = path.join(currentPath, path.basename(yamlPath, '.yaml'))
        if (fs.existsSync(masterTagDir) && fs.statSync(masterTagDir).isDirectory()) {
          await this.processDirectory(masterTagDir, result, masterTagId, attributesByLabel)
        }
      } else if (yamlConfig?.class === card.class.Tag) {
        if (parentMasterTagId === undefined) {
          throw new Error('Tag should be inside master tag folder: ' + currentPath) // todo: confirm this error message
        }

        const tagId = this.tagPaths.get(yamlPath) ?? generateId<Tag>()
        const tag = await this.createTag(yamlConfig, tagId, parentMasterTagId)
        this.tagPaths.set(yamlPath, tagId)

        const attributes = await this.createAttributes(yamlConfig, tagId)

        const docs = result.docs.get(yamlPath) ?? []
        docs.push(tag, ...Array.from(attributes.values()))
        result.docs.set(yamlPath, docs)
      }
    }

    if (parentMasterTagId === undefined || parentAttributesByLabel === undefined) {
      // Means we are in the root directory
      return
    }

    // Then process markdown files (cards)
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue

      const cardPath = path.join(currentPath, entry.name)
      const cardHeader = await readYamlHeader(cardPath)
      const card = await this.createCard(cardHeader, cardPath, parentMasterTagId, parentAttributesByLabel)

      if (card != null) {
        const docs = result.docs.get(cardPath) ?? []
        docs.push(card)
        result.docs.set(cardPath, docs)

        await this.applyTags(card, cardHeader, cardPath, result)
      }
    }
  }

  private async createMasterTag (
    data: Record<string, any>,
    parentMasterTagId?: Ref<MasterTag>
  ): Promise<UnifiedDoc<MasterTag>> {
    const { class: _class, title } = data
    if (_class !== card.class.MasterTag) {
      throw new Error('Invalid master tag data')
    }

    return {
      _class: card.class.MasterTag,
      props: {
        _id: generateId<MasterTag>(),
        space: core.space.Model,
        extends: parentMasterTagId ?? card.class.Card,
        label: 'embedded:embedded:' + title as IntlString, // todo: check if it's correct
        kind: 0,
        icon: card.icon.MasterTag
      }
    }
  }

  private async createTag (
    data: Record<string, any>,
    tagId: Ref<Tag>,
    parentMasterTagId: Ref<MasterTag>
  ): Promise<UnifiedDoc<Tag>> {
    const { class: _class, title } = data
    if (_class !== card.class.Tag) {
      throw new Error('Invalid tag data')
    }

    return {
      _class: card.class.Tag,
      props: {
        _id: tagId,
        space: core.space.Model,
        extends: parentMasterTagId,
        label: 'embedded:embedded:' + title as IntlString,
        kind: 2,
        icon: card.icon.Tag
      }
    }
  }

  private async createAttributes (
    data: Record<string, any>,
    masterTagId: Ref<MasterTag>
  ): Promise<Map<string, UnifiedDoc<Attribute<MasterTag>>>> {
    if (data.properties === undefined) {
      return new Map()
    }

    const attributesByLabel = new Map<string, UnifiedDoc<Attribute<MasterTag>>>()
    for (const property of data.properties) {
      const attr: UnifiedDoc<Attribute<MasterTag>> = {
        _class: core.class.Attribute,
        props: {
          space: core.space.Model,
          attributeOf: masterTagId,
          name: generateId<Attribute<MasterTag>>(),
          label: 'embedded:embedded:' + property.label as IntlString,
          isCustom: true,
          type: {
            _class: 'core:class:' + property.type
          },
          defaultValue: property.defaultValue ?? null
        }
      }
      attributesByLabel.set(property.label, attr)
    }
    return attributesByLabel
  }

  private async createCard (
    cardHeader: Record<string, any>,
    cardPath: string,
    masterTagId: Ref<MasterTag>,
    attributesByLabel: Map<string, UnifiedDoc<Attribute<MasterTag>>>
  ): Promise<UnifiedDoc<Card>> {
    const { _class, title, ...customProperties } = cardHeader

    const props: Record<string, any> = {
      _id: generateId(),
      space: core.space.Workspace,
      title
    }

    for (const [key, value] of Object.entries(customProperties)) {
      const attributeName = attributesByLabel.get(key)?.props.name // todo: handle tag attributes separately
      if (attributeName === undefined) {
        throw new Error(`Attribute not found: ${key}`) // todo: keep the error till builder validation
      }
      props[attributeName] = value
    }

    return {
      _class: masterTagId,
      collabField: 'content',
      contentProvider: () => readMarkdownContent(cardPath),
      props: props as Props<Card> // todo: what is the correct props type?
    }
  }

  private async applyTags (
    card: UnifiedDoc<Card>,
    cardHeader: Record<string, any>,
    cardPath: string,
    result: UnifiedDocProcessResult
  ): Promise<void> {
    if (cardHeader.tags === undefined) return

    const mixins: UnifiedMixin<Card, Tag>[] = []
    for (const tagPath of cardHeader.tags) {
      let tagId = this.tagPaths.get(tagPath)
      if (tagId === undefined) {
        tagId = generateId<Tag>()
        this.tagPaths.set(tagPath, tagId)
      }

      const mixin: UnifiedMixin<Card, Tag> = {
        _id: card.props._id as Ref<Card>,
        _class: card._class,
        space: card.props.space,
        mixin: tagId,
        props: {
          __mixin: 'true'
        }
      }
      mixins.push(mixin)
    }

    if (mixins.length > 0) {
      result.mixins.set(cardPath, mixins)
    }
  }
}
