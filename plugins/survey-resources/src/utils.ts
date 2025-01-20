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

import { clone, type Class, type Client, type Doc, type Ref } from '@hcengineering/core'
import survey, { surveyId, type Poll, type PollData, type Survey } from '@hcengineering/survey'
import { getClient, MessageBox } from '@hcengineering/presentation'
import {
  type Location,
  type ResolvedLocation,
  getCurrentResolvedLocation,
  getPanelURI,
  showPopup
} from '@hcengineering/ui'
import { accessDeniedStore } from '@hcengineering/view-resources'
import view from '@hcengineering/view'

export function hasText (value: string | undefined | null): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

export function makePollData (source: Survey): PollData {
  return {
    survey: source._id,
    name: source.name,
    prompt: source.prompt,
    questions: clone(source.questions),
    isCompleted: false
  }
}

export async function generateSurveyLocation (loc: Location, id: Ref<Survey>): Promise<ResolvedLocation | undefined> {
  const client = getClient()
  const doc = await client.findOne(survey.class.Survey, { _id: id })
  if (doc === undefined) {
    accessDeniedStore.set(true)
    console.error(`Could not find survey ${id}.`)
    return undefined
  }

  const appComponent = loc.path[0] ?? ''
  const workspace = loc.path[1] ?? ''

  const objectPanel = client.getHierarchy().classHierarchyMixin(doc._class as Ref<Class<Doc>>, view.mixin.ObjectPanel)
  const component = objectPanel?.component ?? view.component.EditDoc

  return {
    loc: {
      path: [appComponent, workspace],
      fragment: getPanelURI(component, doc._id, doc._class, 'content')
    },
    defaultLocation: {
      path: [appComponent, workspace, surveyId, 'surveys'],
      fragment: getPanelURI(component, doc._id, doc._class, 'content')
    }
  }
}

export async function generatePollLocation (loc: Location, id: Ref<Poll>): Promise<ResolvedLocation | undefined> {
  const client = getClient()
  const doc = await client.findOne(survey.class.Poll, { _id: id })
  if (doc === undefined) {
    accessDeniedStore.set(true)
    console.error(`Could not find poll ${id}.`)
    return undefined
  }

  const appComponent = loc.path[0] ?? ''
  const workspace = loc.path[1] ?? ''
  const appId = loc.path[2] ?? ''

  const objectPanel = client.getHierarchy().classHierarchyMixin(doc._class as Ref<Class<Doc>>, view.mixin.ObjectPanel)
  const component = objectPanel?.component ?? view.component.EditDoc

  return {
    loc: {
      path: [appComponent, workspace],
      fragment: getPanelURI(component, doc._id, doc._class, 'content')
    },
    defaultLocation: {
      path: [appComponent, workspace, appId],
      fragment: getPanelURI(component, doc._id, doc._class, 'content')
    }
  }
}

export async function resolveLocation (loc: Location): Promise<ResolvedLocation | undefined> {
  if (loc.path[2] !== surveyId) {
    return undefined
  }

  if (loc.path[3] === undefined) {
    return undefined
  }

  if (loc.path[3] === 'surveys') {
    return undefined
  }

  if (loc.path[3] === 'poll') {
    return await generatePollLocation(loc, loc.path[4] as Ref<Poll>)
  }

  return await generateSurveyLocation(loc, loc.path[3] as Ref<Survey>)
}

export async function getSurveyLink (doc: Doc): Promise<Location> {
  const loc = getCurrentResolvedLocation()
  loc.path.length = 2
  loc.fragment = undefined
  loc.query = undefined
  loc.path[2] = surveyId
  loc.path[3] = doc._id
  return loc
}

export async function getPollLink (doc: Doc): Promise<Location> {
  const loc = getCurrentResolvedLocation()
  loc.path.length = 3
  loc.fragment = undefined
  loc.query = undefined
  // loc.path[2] is the app id from where the link is generated
  loc.path[3] = 'poll'
  loc.path[4] = doc._id
  return loc
}

export async function pollTitleProvider (client: Client, ref: Ref<Doc>, doc?: Doc): Promise<string> {
  const obj = await client.findOne(survey.class.Poll, { _id: ref as Ref<Poll> })
  if (obj !== undefined && hasText(obj.name)) {
    return obj.name
  }
  return ''
}

export async function surveyTitleProvider (client: Client, ref: Ref<Doc>, doc?: Doc): Promise<string> {
  const obj = await client.findOne(survey.class.Survey, { _id: ref as Ref<Survey> })
  if (obj !== undefined && hasText(obj.name)) {
    return obj.name
  }
  return ''
}

export async function deletePoll (poll: Poll): Promise<void> {
  showPopup(
    MessageBox,
    {
      label: survey.string.DeletePoll,
      message: survey.string.DeletePollConfirm
    },
    undefined,
    async (result?: boolean) => {
      if (result === true) {
        await getClient().removeCollection(
          poll._class,
          poll.space,
          poll._id,
          poll.attachedTo,
          poll.attachedToClass,
          'polls'
        )
      }
    }
  )
}
