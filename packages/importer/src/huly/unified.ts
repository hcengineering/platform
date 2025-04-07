// unified.ts
import card, { Card, MasterTag, Tag } from '@hcengineering/card'
import core, {
  Association,
  Attribute,
  Doc,
  generateId,
  Ref
} from '@hcengineering/core'
import * as fs from 'fs'
import * as yaml from 'js-yaml'
import * as path from 'path'
import { IntlString } from '../../../platform/types'
import { Props, UnifiedDoc, UnifiedMixin } from '../types'
import { readMarkdownContent, readYamlHeader } from './parsing'
import { PathToRefResolver } from './resolver'

export interface UnifiedDocProcessResult {
  docs: Map<string, Array<UnifiedDoc<Doc>>>
  mixins: Map<string, Array<UnifiedMixin<Doc, Doc>>>
}

export class UnifiedDocProcessor {
  private readonly pathToRefResolver = new PathToRefResolver()

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
    parentMasterTagAttrs?: Map<string, UnifiedDoc<Attribute<MasterTag>>>
  ): Promise<void> {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true })

    // Сначала обрабатываем YAML файлы (потенциальные мастер-теги)
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.yaml')) continue // todo: filter entries by extension

      const yamlPath = path.resolve(currentPath, entry.name)
      const yamlConfig = yaml.load(fs.readFileSync(yamlPath, 'utf8')) as Record<string, any>

      switch (yamlConfig?.class) {
        case card.class.MasterTag: {
          const masterTagId = this.pathToRefResolver.getIdByFullPath(yamlPath) as Ref<MasterTag>
          const masterTag = await this.createMasterTag(yamlConfig, masterTagId, parentMasterTagId)
          const masterTagAttrs = await this.createAttributes(yamlConfig, masterTagId)

          const docs = result.docs.get(yamlPath) ?? []
          docs.push(
            masterTag,
            ...Array.from(masterTagAttrs.values())
          )
          result.docs.set(yamlPath, docs)

          const masterTagDir = path.join(currentPath, path.basename(yamlPath, '.yaml'))
          if (fs.existsSync(masterTagDir) && fs.statSync(masterTagDir).isDirectory()) {
            await this.processDirectory(masterTagDir, result, masterTagId, masterTagAttrs)
          }
          break
        }
        case card.class.Tag: {
          if (parentMasterTagId === undefined) {
            throw new Error('Tag should be inside master tag folder: ' + currentPath)
          }

          await this.processTag(yamlPath, yamlConfig, result, parentMasterTagId)
          break
        }
        case core.class.Association: {
          const association = await this.createAssociation(yamlPath, yamlConfig)
          result.docs.set(yamlPath, [association])
          break
        }
        default:
          throw new Error('Unsupported class: ' + yamlConfig?.class) // todo: handle default case just convert to UnifiedDoc
      }
    }

    if (parentMasterTagId === undefined || parentMasterTagAttrs === undefined) {
      await this.processSystemCards(currentPath, result)
    } else {
      // Then process markdown files (cards)
      await this.processCardDirectory(result, currentPath, parentMasterTagId, parentMasterTagAttrs)
    }
  }

  private async processSystemCards (
    currentDir: string,
    result: UnifiedDocProcessResult
  ): Promise<void> {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue
      const cardPath = path.join(currentDir, entry.name)
      const { class: cardType, ...cardProps } = await readYamlHeader(cardPath)

      if (cardType.startsWith('card:types:') === false) {
        throw new Error('Unsupported card type: ' + cardType)
      }

      await this.processCard(result, cardPath, cardProps, cardType, new Map()) // todo: get right master tag attributes
    }
  }

  private async processCard (
    result: UnifiedDocProcessResult,
    cardPath: string,
    cardProps: Record<string, any>,
    masterTagId: Ref<MasterTag>,
    masterTagAttrs: Map<string, UnifiedDoc<Attribute<MasterTag>>>,
    parentCardId?: Ref<Card>
  ): Promise<void> {
    const card = await this.createCard(cardProps, cardPath, masterTagId, masterTagAttrs, parentCardId)

    if (card != null) {
      const docs = result.docs.get(cardPath) ?? []
      docs.push(card)
      result.docs.set(cardPath, docs)

      await this.applyTags(card, cardProps, cardPath, result)

      // Проверяем наличие дочерних карточек
      const cardDir = path.join(path.dirname(cardPath), path.basename(cardPath, '.md'))
      if (fs.existsSync(cardDir) && fs.statSync(cardDir).isDirectory()) {
        await this.processCardDirectory(result, cardDir, masterTagId, masterTagAttrs, card.props._id as Ref<Card>)
      }
    }
  }

  private async processCardDirectory (
    result: UnifiedDocProcessResult,
    cardDir: string,
    masterTagId: Ref<MasterTag>,
    masterTagAttrs: Map<string, UnifiedDoc<Attribute<MasterTag>>>,
    parentCardId?: Ref<Card>
  ): Promise<void> {
    const entries = fs.readdirSync(cardDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue
      const childCardPath = path.join(cardDir, entry.name)
      const { class: cardClass, ...cardProps } = await readYamlHeader(childCardPath)
      await this.processCard(result, childCardPath, cardProps, masterTagId, masterTagAttrs, parentCardId)
    }
  }

  private async createMasterTag (
    data: Record<string, any>,
    masterTagId: Ref<MasterTag>,
    parentMasterTagId?: Ref<MasterTag>
  ): Promise<UnifiedDoc<MasterTag>> {
    const { class: _class, title } = data
    if (_class !== card.class.MasterTag) {
      throw new Error('Invalid master tag data')
    }

    return {
      _class: card.class.MasterTag,
      props: {
        _id: masterTagId,
        space: core.space.Model,
        extends: parentMasterTagId ?? card.class.Card,
        label: 'embedded:embedded:' + title as IntlString, // todo: check if it's correct
        kind: 0,
        icon: card.icon.MasterTag
      }
    }
  }

  private async processTag (
    tagPath: string,
    tagConfig: Record<string, any>,
    result: UnifiedDocProcessResult,
    masterTagId: Ref<MasterTag>,
    parentTagId?: Ref<Tag>
  ): Promise<void> {
    const tagId = this.pathToRefResolver.getIdByFullPath(tagPath) as Ref<Tag>
    const tag = await this.createTag(tagConfig, tagId, masterTagId, parentTagId)

    const attributes = await this.createAttributes(tagConfig, tagId)

    const docs = result.docs.get(tagPath) ?? []
    docs.push(tag, ...Array.from(attributes.values()))
    result.docs.set(tagPath, docs)

    // Обрабатываем дочерние теги
    const tagDir = path.join(path.dirname(tagPath), path.basename(tagPath, '.yaml'))
    if (fs.existsSync(tagDir) && fs.statSync(tagDir).isDirectory()) {
      await this.processTagDirectory(tagDir, result, masterTagId, tagId)
    }
  }

  private async processTagDirectory (
    tagDir: string,
    result: UnifiedDocProcessResult,
    parentMasterTagId: Ref<MasterTag>,
    parentTagId: Ref<Tag>
  ): Promise<void> {
    const entries = fs.readdirSync(tagDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.yaml')) continue
      const childTagPath = path.join(tagDir, entry.name)
      const childTagConfig = yaml.load(fs.readFileSync(childTagPath, 'utf8')) as Record<string, any>

      if (childTagConfig?.class === card.class.Tag) {
        await this.processTag(childTagPath, childTagConfig, result, parentMasterTagId, parentTagId)
      }
    }
  }

  private async createTag (
    data: Record<string, any>,
    tagId: Ref<Tag>,
    masterTagId: Ref<MasterTag>,
    parentTagId?: Ref<Tag>
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
        extends: parentTagId ?? masterTagId,
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
    masterTagAttrs: Map<string, UnifiedDoc<Attribute<MasterTag>>>,
    parentCardId?: Ref<Card>
  ): Promise<UnifiedDoc<Card>> {
    const { _class, title, tags, ...customProperties } = cardHeader

    const cardId = this.pathToRefResolver.getIdByFullPath(cardPath) as Ref<Card>
    const props: Record<string, any> = {
      _id: cardId,
      space: core.space.Workspace,
      title,
      parent: parentCardId
    }

    for (const [key, value] of Object.entries(customProperties)) {
      const attrName = masterTagAttrs.get(key)?.props.name // todo: handle tag attributes separately
      // if (attrName === undefined) {
      //   throw new Error(`Attribute not found: ${key}`) // todo: keep the error till builder validation
      // }
      props[attrName] = value
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
      const cardDir = path.dirname(cardPath)
      const fullTagPath = path.resolve(cardDir, tagPath)
      const tagId = this.pathToRefResolver.getIdByFullPath(fullTagPath) as Ref<Tag>

      const mixin: UnifiedMixin<Card, Tag> = {
        _class: card._class,
        mixin: tagId,
        props: {
          _id: card.props._id as Ref<Card>,
          space: core.space.Workspace,
          __mixin: 'true'
        } as unknown as Props<Tag> // todo: what is the correct props type?
      }
      mixins.push(mixin)
    }

    if (mixins.length > 0) {
      result.mixins.set(cardPath, mixins)
    }
  }

  private async createAssociation (
    yamlPath: string,
    yamlConfig: Record<string, any>
  ): Promise<UnifiedDoc<Association>> {
    const { class: _class, typeA, typeB, ...otherProps } = yamlConfig

    const currentPath = path.dirname(yamlPath)
    const typeAId = this.pathToRefResolver.getIdByRelativePath(currentPath, typeA) as Ref<MasterTag>
    const typeBId = this.pathToRefResolver.getIdByRelativePath(currentPath, typeB) as Ref<MasterTag>

    const associationId = this.pathToRefResolver.getIdByFullPath(yamlPath) as Ref<Association>
    return {
      _class: core.class.Association,
      props: {
        _id: associationId,
        space: core.space.Model,
        classA: typeAId,
        classB: typeBId,
        ...otherProps
      } as unknown as Props<Association>
    }
  }
}
