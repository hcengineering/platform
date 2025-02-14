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

import { AccountRole } from '@hcengineering/core'
import { type Builder } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import view, { type Viewlet } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import mail from '@hcengineering/mail'
import { personalBrowserId } from '@hcengineering/personal-browser'

import personalBrowser from './plugin'

export { personalBrowserId } from '@hcengineering/personal-browser'

export { personalBrowser as default }

export function createModel (builder: Builder): void {
  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: personalBrowser.string.PersonalBrowser,
      icon: personalBrowser.icon.PersonalBrowser,
      alias: personalBrowserId,
      accessLevel: AccountRole.User,
      hidden: false,
      navigatorModel: {
        spaces: [],
        specials: [
          {
            id: 'mail',
            label: personalBrowser.string.Mail,
            icon: personalBrowser.icon.Mail,
            component: workbench.component.SpecialView,
            componentProps: {
              _class: mail.class.MailThread,
              icon: personalBrowser.icon.Mail,
              label: personalBrowser.string.Mail,
              createLabel: mail.string.CreateMail,
              createComponent: mail.component.CreateMail
            }
          }
        ]
      }
    },
    personalBrowser.app.PersonalBrowser
  )

  builder.createDoc<Viewlet>(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: mail.class.MailThread,
      descriptor: view.viewlet.Table,
      config: [
        { key: 'createdBy', displayProps: { fixed: 'left', key: 'app' } },
        '',
        { key: '', displayProps: { grow: true } },
        { key: 'modifiedOn', displayProps: { key: 'modified', fixed: 'right' } }
      ],
      configOptions: {
        hiddenKeys: ['name', 'questions'],
        sortable: true
      }
    },
    personalBrowser.viewlet.TableMail
  )
}
