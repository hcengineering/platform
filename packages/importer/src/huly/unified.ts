// unified.ts
import { UnifiedDoc, Props } from '../types'
import card, { Card, MasterTag } from '@hcengineering/card'
import core, {
  Attribute,
  type Doc,
  generateId,
  type Ref,
} from '@hcengineering/core'
import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { IntlString } from '../../../platform/types'
import { readMarkdownContent, readYamlHeader } from './parsing'

export type UnifiedDocProcessResult = Map<string, Array<UnifiedDoc<Doc>>>

export class UnifiedDocProcessor {
  async importFromDirectory (directoryPath: string): Promise<UnifiedDocProcessResult> {
    const unifiedDocs: UnifiedDocProcessResult = new Map()
    await this.processDirectory(directoryPath, unifiedDocs)
    return unifiedDocs
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
        const attributesByLabel = await this.createMasterTagAttributes(yamlConfig, masterTagId)

        // Добавляем мастер-тег и его атрибуты
        const docs = result.get(yamlPath) ?? []
        docs.push(
          masterTag,
          ...Array.from(attributesByLabel.values())
        )
        result.set(yamlPath, docs)

        // Рекурсивно обрабатываем содержимое директории мастер-тега
        const tagDir = path.join(currentPath, path.basename(yamlPath, '.yaml'))
        if (fs.existsSync(tagDir) && fs.statSync(tagDir).isDirectory()) {
          await this.processDirectory(tagDir, result, masterTagId, attributesByLabel)
        }
      }
    }

    if (parentMasterTagId === undefined || parentAttributesByLabel === undefined) {
      // means we are in the root directory
      return
    }

    // Затем обрабатываем markdown файлы (карточки)
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue

      const cardPath = path.join(currentPath, entry.name)
      const cardHeader = await readYamlHeader(cardPath)
      const unifiedDoc = await this.createCard(cardHeader, cardPath, parentMasterTagId, parentAttributesByLabel)

      if (unifiedDoc != null) {
        const docs = result.get(cardPath) ?? []
        docs.push(unifiedDoc)
        result.set(cardPath, docs)
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

  private async createMasterTagAttributes (
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
          label: 'embedded:embedded:' + property.label as IntlString, // todo: check if it's correct
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
      const attributeName = attributesByLabel.get(key)?.props.name
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
}
