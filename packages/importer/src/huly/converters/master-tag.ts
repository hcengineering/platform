import card, { MasterTag } from '@hcengineering/card'
import core, { Attribute, generateId } from '@hcengineering/core'
import { converter, UnifiedDoc } from '../../types'
import { IntlString } from '../../../../platform/types'

export const masterTagConverter: converter = (data: Record<string, any>) => {
  const { class: _class, title, properties } = data
  if (_class !== card.class.MasterTag) {
    throw new Error('Invalid master tag data')
  }

  const masterTagId = generateId(card.class.MasterTag)
  const masterTag: UnifiedDoc<MasterTag> = {
    _class: card.class.MasterTag,
    props: {
      _id: masterTagId,
      space: core.space.Model,
      extends: card.class.Card,
      label: 'embedded:embedded:' + title as IntlString, // todo: check if it's correct
      kind: 0,
      icon: card.icon.MasterTag
    }
  }

  const attributes: UnifiedDoc<Attribute<MasterTag>>[] = []
  for (const property of properties) {
    attributes.push({
      _class: core.class.Attribute,
      props: {
        space: core.space.Model,
        attributeOf: masterTagId,
        name: generateId(core.class.Attribute),
        label: 'embedded:embedded:' + property.label as IntlString, // todo: check if it's correct
        isCustom: true,
        type: {
          _class: 'core:class:Type' + property.type
        },
        defaultValue: property.defaultValue ?? null
      }
    })
  }
  return [masterTag, ...attributes]
}
