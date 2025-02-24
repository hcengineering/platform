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

import { type Resources } from '@hcengineering/platform'
import CreateSurvey from './components/CreateSurvey.svelte'
import EditPollPanel from './components/EditPollPanel.svelte'
import EditSurveyPanel from './components/EditSurveyPanel.svelte'
import PollCollection from './components/PollCollection.svelte'
import SurveyPresenter from './components/SurveyPresenter.svelte'

import {
  deletePoll,
  getPollLink,
  getSurveyLink,
  pollTitleProvider,
  resolveLocation,
  surveyTitleProvider
} from './utils'

export * from './utils'

export default async (): Promise<Resources> => ({
  component: {
    CreateSurvey,
    EditPollPanel,
    EditSurveyPanel,
    PollCollection,
    PollPresenter: SurveyPresenter,
    SurveyPresenter
  },
  resolver: {
    Location: resolveLocation
  },
  function: {
    GetPollLink: getPollLink,
    GetSurveyLink: getSurveyLink,
    PollTitleProvider: pollTitleProvider,
    SurveyTitleProvider: surveyTitleProvider
  },
  actionImpl: {
    DeletePoll: deletePoll
  }
})
