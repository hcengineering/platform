import { type Builder } from '@hcengineering/model'
import view from '@hcengineering/model-view'
import core, { type Class, type Ref } from '@hcengineering/core'
import card, { type Card } from '@hcengineering/card'

export function createCardTableViewlet<T extends Card> (builder: Builder, _class: Ref<Class<T>>, _id?: Ref<T>): void {
  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: _class,
    descriptor: view.viewlet.Table,
    configOptions: {
      hiddenKeys: ['description', 'title']
    },
    config: [
      '',
      '_class',
      { key: '', presenter: view.component.RolePresenter, label: card.string.Tags, props: { fullSize: true } },
      'modifiedOn'
    ]
  })
}
