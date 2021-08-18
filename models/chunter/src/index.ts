//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import type { IntlString } from '@anticrm/platform'
import { Builder, Model, UX } from '@anticrm/model'
import type { Ref, Doc, Class, Domain } from '@anticrm/core'
import core, { TSpace, TDoc } from '@anticrm/model-core'
import type { Backlink, Channel, Message, Comment } from '@anticrm/chunter'
import type { AnyComponent } from '@anticrm/ui'

import workbench from '@anticrm/model-workbench'

import view from '@anticrm/model-view'
import chunter from './plugin'

export const DOMAIN_CHUNTER = 'chunter' as Domain
export const DOMAIN_COMMENT = 'comment' as Domain

@Model(chunter.class.Channel, core.class.Space)
@UX(chunter.string.Channel, chunter.icon.Hashtag)
export class TChannel extends TSpace implements Channel {}

@Model(chunter.class.Message, core.class.Doc, DOMAIN_CHUNTER)
export class TMessage extends TDoc implements Message {
  content!: string
}

@Model(chunter.class.Comment, core.class.Doc, DOMAIN_COMMENT)
export class TComment extends TDoc implements Comment {
  objectId!: Ref<Doc>
  message!: string
}

@Model(chunter.class.Backlink, chunter.class.Comment)
export class TBacklink extends TComment implements Backlink {
  backlinkId!: Ref<Doc>
  backlinkClass!: Ref<Class<Doc>>
}

export function createModel (builder: Builder): void {
  builder.createModel(TChannel, TMessage, TComment, TBacklink)
  builder.mixin(chunter.class.Channel, core.class.Class, workbench.mixin.SpaceView, {
    view: {
      class: chunter.class.Message
    }
  })

  builder.createDoc(view.class.ViewletDescriptor, core.space.Model, {
    label: 'Chat' as IntlString,
    icon: view.icon.Table,
    component: chunter.component.ChannelView
  }, chunter.viewlet.Chat)

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: chunter.class.Message,
    descriptor: chunter.viewlet.Chat,
    open: 'X' as AnyComponent,
    config: {}
  })

  builder.createDoc(workbench.class.Application, core.space.Model, {
    label: chunter.string.ApplicationLabelChunter,
    icon: chunter.icon.Chunter,
    navigatorModel: {
      spaces: [
        {
          label: chunter.string.Channels,
          spaceClass: chunter.class.Channel,
          addSpaceLabel: chunter.string.CreateChannel,
          createComponent: chunter.component.CreateChannel
        }
      ]
    }
  })
  builder.createDoc(chunter.class.Channel, core.space.Model, {
    name: 'general',
    description: 'General Channel',
    private: false,
    members: []
  })
  builder.createDoc(chunter.class.Channel, core.space.Model, {
    name: 'random',
    description: 'Random Talks',
    private: false,
    members: []
  })
}
