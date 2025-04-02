import core, { Doc } from '@hcengineering/core'
import card from '@hcengineering/card'
import { Converter, UnifiedDoc } from '../types'

export class MasterTagConverter implements Converter<Doc> {
  convert (data: Record<string, any>): UnifiedDoc {
    if (data.class !== card.class.MasterTag) {
      throw new Error('Invalid master tag data')
    }

    return {
      _class: card.class.MasterTag,
      data: {
        space: core.space.Model,
        label: data.title,
        extends: card.class.Card,
        kind: 0,
        icon: 'card:icon:MasterTag',
        ...data.properties
      }
    }
  }
}

export class CardConverter implements Converter<Doc> {
  convert (data: any): UnifiedDoc {
    const { class: cardClass, title, content, ...customFields } = data

    return {
      _class: cardClass,
      data: {
        space: core.space.Workspace,
        title,
        content,
        rank: '#nextRank',
        parentInfo: [],
        blobs: {},
        ...customFields
      }
    }
  }
}
