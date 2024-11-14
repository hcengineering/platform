//
// Copyright © 2024 Hardcore Engineering Inc.
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

import activity from '@hcengineering/activity'
import { AccountRole } from '@hcengineering/core'
import { type Builder } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import chunter from '@hcengineering/model-chunter'
import view, { type Viewlet } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import { surveyId } from '@hcengineering/survey'
import { TPoll, TSurvey } from './types'
import survey from './plugin'

export { surveyId } from '@hcengineering/survey'
export { surveyOperation } from './migration'
export default survey
export * from './types'

export function createModel (builder: Builder): void {
  builder.createModel(TPoll, TSurvey)

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: survey.string.Application,
      icon: survey.icon.Application,
      alias: surveyId,
      accessLevel: AccountRole.User,
      hidden: false,
      locationResolver: survey.resolver.Location,
      navigatorModel: {
        spaces: [],
        specials: [
          {
            id: 'surveys',
            label: survey.string.Surveys,
            icon: survey.icon.Survey,
            component: workbench.component.SpecialView,
            componentProps: {
              _class: survey.class.Survey,
              icon: survey.icon.Survey,
              label: survey.string.Surveys,
              createLabel: survey.string.CreateSurvey,
              createComponent: survey.component.CreateSurvey
            }
          }
        ]
      }
    },
    survey.app.Survey
  )

  builder.createDoc<Viewlet>(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: survey.class.Survey,
      descriptor: view.viewlet.Table,
      config: ['', 'modifiedOn'],
      configOptions: {
        hiddenKeys: ['name', 'questions'],
        sortable: true
      }
    },
    survey.viewlet.TableSurvey
  )

  builder.mixin(survey.class.Survey, core.class.Class, view.mixin.ObjectPanel, {
    component: survey.component.EditSurveyPanel
  })

  builder.mixin(survey.class.Survey, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: survey.component.SurveyPresenter
  })

  builder.mixin(survey.class.Survey, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: survey.class.Survey,
    components: { input: { component: chunter.component.ChatMessageInput } }
  })

  builder.createDoc<Viewlet>(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: survey.class.Poll,
      descriptor: view.viewlet.Table,
      config: ['', 'modifiedOn'],
      configOptions: {
        hiddenKeys: ['name', 'survey', 'results'],
        sortable: true
      }
    },
    survey.viewlet.TablePoll
  )

  builder.mixin(survey.class.Poll, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: survey.component.PollPresenter
  })

  builder.mixin(survey.class.Poll, core.class.Class, view.mixin.CollectionEditor, {
    editor: survey.component.PollCollection
  })
}
