// unified.ts
import card, { Card, MasterTag, Tag } from '@hcengineering/card'
import core, {
  Association,
  Attribute,
  Doc,
  generateId,
  Ref,
  Relation
} from '@hcengineering/core'
import * as fs from 'fs'
import * as yaml from 'js-yaml'
import * as path from 'path'
import { IntlString } from '../../../platform/types'
import { Props, UnifiedDoc, UnifiedMixin } from '../types'
import { MetadataStorage, RelationMetadata } from './metadata'
import { readMarkdownContent, readYamlHeader } from './parsing'

export interface UnifiedDocProcessResult {
  docs: Map<string, Array<UnifiedDoc<Doc>>>
  mixins: Map<string, Array<UnifiedMixin<Doc, Doc>>>
}

export class UnifiedDocProcessor {
  private readonly metadataStorage = new MetadataStorage()

  async importFromDirectory (directoryPath: string): Promise<UnifiedDocProcessResult> {
    const result: UnifiedDocProcessResult = {
      docs: new Map(),
      mixins: new Map()
    }
    // Первый проход - собираем метаданные
    await this.processMetadata(directoryPath, result)

    await this.processSystemCards(directoryPath, result, new Map()) // todo: get master tag relations
    // Второй проход - обрабатываем карточки
    await this.processCards(directoryPath, result, new Map())

    return result
  }

  private async processMetadata (
    currentPath: string,
    result: UnifiedDocProcessResult,
    parentMasterTagId?: Ref<MasterTag>
  ): Promise<void> {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true })

    // Обрабатываем только YAML файлы
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.yaml')) continue

      const yamlPath = path.resolve(currentPath, entry.name)
      const yamlConfig = yaml.load(fs.readFileSync(yamlPath, 'utf8')) as Record<string, any>

      switch (yamlConfig?.class) {
        case card.class.MasterTag: {
          const masterTagId = this.metadataStorage.getIdByFullPath(yamlPath) as Ref<MasterTag>
          const masterTag = await this.createMasterTag(yamlConfig, masterTagId, parentMasterTagId)
          const masterTagAttrs = await this.createAttributes(yamlConfig, masterTagId)

          this.metadataStorage.setAttributes(yamlPath, masterTagAttrs)
          result.docs.set(yamlPath, [masterTag, ...Array.from(masterTagAttrs.values())])

          // Рекурсивно обрабатываем поддиректорию
          const masterTagDir = path.join(currentPath, path.basename(yamlPath, '.yaml'))
          if (fs.existsSync(masterTagDir) && fs.statSync(masterTagDir).isDirectory()) {
            await this.processMetadata(masterTagDir, result, masterTagId)
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

    // Рекурсивно обрабатываем поддиректории
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const dirPath = path.join(currentPath, entry.name)
      await this.processMetadata(dirPath, result, parentMasterTagId)
    }
  }

  private async processCards (
    currentPath: string,
    result: UnifiedDocProcessResult,
    masterTagRelations: Map<string, RelationMetadata>,
    masterTagId?: Ref<MasterTag>
  ): Promise<void> {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true })

    // Проверяем, есть ли YAML файл MasterTag'а для текущей директории
    const yamlPath = currentPath + '.yaml'
    if (fs.existsSync(yamlPath)) {
      const yamlConfig = yaml.load(fs.readFileSync(yamlPath, 'utf8')) as Record<string, any>
      if (yamlConfig?.class === card.class.MasterTag) {
        masterTagId = this.metadataStorage.getIdByFullPath(yamlPath) as Ref<MasterTag>
        this.metadataStorage.getAssociations(yamlPath).forEach((relationMetadata, propName) => {
          masterTagRelations.set(propName, relationMetadata)
        })
      }
    }

    // Обрабатываем MD файлы с учетом текущего MasterTag'а
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const cardPath = path.join(currentPath, entry.name)
        const { class: cardType, ...cardProps } = await readYamlHeader(cardPath)

        if (masterTagId !== undefined) {
          await this.processCard(result, cardPath, cardProps, masterTagId, masterTagRelations)
        }
      }
    }

    // Рекурсивно обрабатываем поддиректории с передачей текущего MasterTag'а
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const dirPath = path.join(currentPath, entry.name)
      await this.processCards(dirPath, result, masterTagRelations, masterTagId)
    }
  }

  private async processSystemCards (
    currentDir: string,
    result: UnifiedDocProcessResult,
    masterTagRelations: Map<string, RelationMetadata>
  ): Promise<void> {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue
      const cardPath = path.join(currentDir, entry.name)
      const { class: cardType, ...cardProps } = await readYamlHeader(cardPath)

      if (cardType.startsWith('card:types:') === false) {
        throw new Error('Unsupported card type: ' + cardType)
      }

      await this.processCard(result, cardPath, cardProps, cardType, masterTagRelations) // todo: get right master tag attributes
    }
  }

  private async processCard (
    result: UnifiedDocProcessResult,
    cardPath: string,
    cardProps: Record<string, any>,
    masterTagId: Ref<MasterTag>,
    masterTagRelations: Map<string, RelationMetadata>,
    parentCardId?: Ref<Card>
  ): Promise<void> {
    const cardWithRelations = await this.createCard(cardProps, cardPath, masterTagId, masterTagRelations, parentCardId)

    if (cardWithRelations.length > 0) {
      const docs = result.docs.get(cardPath) ?? []
      docs.push(...cardWithRelations)
      result.docs.set(cardPath, docs)

      const card = cardWithRelations[0] as UnifiedDoc<Card>
      await this.applyTags(card, cardProps, cardPath, result)

      // Проверяем наличие дочерних карточек
      const cardDir = path.join(path.dirname(cardPath), path.basename(cardPath, '.md'))
      if (fs.existsSync(cardDir) && fs.statSync(cardDir).isDirectory()) {
        await this.processCardDirectory(result, cardDir, masterTagId, masterTagRelations, card.props._id as Ref<Card>)
      }
    }
  }

  private async processCardDirectory (
    result: UnifiedDocProcessResult,
    cardDir: string,
    masterTagId: Ref<MasterTag>,
    masterTagRelations: Map<string, RelationMetadata>,
    parentCardId?: Ref<Card>
  ): Promise<void> {
    const entries = fs.readdirSync(cardDir, { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.endsWith('.md'))

    for (const entry of entries) {
      const childCardPath = path.join(cardDir, entry.name)
      const { class: cardClass, ...cardProps } = await readYamlHeader(childCardPath)
      await this.processCard(result, childCardPath, cardProps, masterTagId, masterTagRelations, parentCardId)
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
    const tagId = this.metadataStorage.getIdByFullPath(tagPath) as Ref<Tag>
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
    masterTagRelations: Map<string, RelationMetadata>, // todo: rename to masterTagsAssociations
    parentCardId?: Ref<Card>
  ): Promise<UnifiedDoc<Doc>[]> {
    const { _class, title, tags, ...customProperties } = cardHeader

    const cardId = this.metadataStorage.getIdByFullPath(cardPath) as Ref<Card>
    const cardProps: Record<string, any> = {
      _id: cardId,
      space: core.space.Workspace,
      title,
      parent: parentCardId
    }

    const masterTagPath = path.dirname(cardPath) + '.yaml' // todo: fix master tag path
    const masterTagAttrs = this.metadataStorage.getAttributes(masterTagPath) // todo: handle master tag attributes recursively
    // const masterTagRelations = this.metadataStorage.getAssociations(masterTagPath)
    // todo: handle tag attributes separately

    const tagAssociations = new Map<string, RelationMetadata>()
    for (const tag of tags) {
      const tagPath = path.resolve(path.dirname(cardPath), tag)
      this.metadataStorage.getAssociations(tagPath).forEach((relationMetadata, propName) => {
        tagAssociations.set(propName, relationMetadata)
      })
    }

    const relations: UnifiedDoc<Doc>[] = []
    for (const [key, value] of Object.entries(customProperties)) {
      const propName = masterTagAttrs.get(key)?.props.name // todo: handle tag attributes separately
      // if (propName === undefined) {
      //   throw new Error(`Attribute not found: ${key}`) // todo: keep the error till builder validation
      // }
      if (masterTagRelations.has(key) || tagAssociations.has(key)) {
        const metadata = masterTagRelations.get(key) ?? tagAssociations.get(key)
        if (metadata === undefined) {
          throw new Error(`Association not found: ${key}, ${cardPath}`) // todo: keep the error till builder validation
        }
        const otherCardPath = path.resolve(path.dirname(cardPath), value)
        const otherCardId = this.metadataStorage.getIdByFullPath(otherCardPath) as Ref<Card>
        const relation: UnifiedDoc<Relation> = this.createRelation(metadata, cardId, otherCardId)
        relations.push(relation)
      } else {
        cardProps[propName] = value
      }
    }

    return [
      {
        _class: masterTagId,
        collabField: 'content',
        contentProvider: () => readMarkdownContent(cardPath),
        props: cardProps as Props<Card> // todo: what is the correct props type?
      },
      ...relations
    ]
  }

  private createRelation (metadata: RelationMetadata, cardId: Ref<Card>, otherCardId: Ref<Card>): UnifiedDoc<Relation> {
    const otherCardField = metadata.field === 'docA' ? 'docB' : 'docA'
    const relation: UnifiedDoc<Relation> = {
      _class: core.class.Relation,
      props: {
        _id: generateId<Relation>(),
        space: core.space.Model,
        [metadata.field]: cardId,
        [otherCardField]: otherCardId,
        association: metadata.association
      } as unknown as Props<Relation>
    }
    return relation
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
      const tagId = this.metadataStorage.getIdByFullPath(fullTagPath) as Ref<Tag>

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
    console.log('createAssociation', yamlPath)
    const { class: _class, typeA, typeB, type, nameA, nameB } = yamlConfig

    const currentPath = path.dirname(yamlPath)
    const associationId = this.metadataStorage.getIdByFullPath(yamlPath) as Ref<Association>

    const typeAPath = path.resolve(currentPath, typeA)
    this.metadataStorage.addAssociation(typeAPath, nameB, {
      association: associationId,
      field: 'docA',
      type
    })

    const typeBPath = path.resolve(currentPath, typeB)
    this.metadataStorage.addAssociation(typeBPath, nameA, {
      association: associationId,
      field: 'docB',
      type
    })

    const typeAId = this.metadataStorage.getIdByFullPath(typeAPath) as Ref<MasterTag>
    const typeBId = this.metadataStorage.getIdByFullPath(typeBPath) as Ref<MasterTag>

    return {
      _class,
      props: {
        _id: associationId,
        space: core.space.Model,
        classA: typeAId,
        classB: typeBId,
        nameA,
        nameB,
        type
      } as unknown as Props<Association>
    }
  }
}
