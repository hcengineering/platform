//
// Copyright © 2022 Hardcore Engineering Inc.
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

import recruit, { Applicant, Vacancy } from '@anticrm/recruit'
import { Doc } from '@anticrm/core'
import login from '@anticrm/login'
import { getMetadata } from '@anticrm/platform'
import workbench from '@anticrm/workbench'
import view from '@anticrm/view'

/**
 * @public
 */
export function vacancyHTMLPresenter (doc: Doc): string {
  const vacancy = doc as Vacancy
  const front = getMetadata(login.metadata.FrontUrl) ?? ''
  return `<a href="${front}/${workbench.component.WorkbenchApp}/${recruit.app.Recruit}/${vacancy._id}/#${recruit.component.EditVacancy}|${vacancy._id}|${vacancy._class}">${vacancy.name}</a>`
}

/**
 * @public
 */
export function vacancyTextPresenter (doc: Doc): string {
  const vacancy = doc as Vacancy
  return `${vacancy.name}`
}

/**
 * @public
 */
export function applicationHTMLPresenter (doc: Doc): string {
  const applicant = doc as Applicant
  const front = getMetadata(login.metadata.FrontUrl) ?? ''
  return `<a href="${front}/${workbench.component.WorkbenchApp}/${recruit.app.Recruit}/${applicant.space}/#${view.component.EditDoc}|${applicant._id}|${applicant._class}">APP-${applicant.number}</a>`
}

/**
 * @public
 */
export function applicationTextPresenter (doc: Doc): string {
  const applicant = doc as Applicant
  return `APP-${applicant.number}`
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  function: {
    VacancyHTMLPresenter: vacancyHTMLPresenter,
    VacancyTextPresenter: vacancyTextPresenter,
    ApplicationHTMLPresenter: applicationHTMLPresenter,
    ApplicationTextPresenter: applicationTextPresenter
  }
})
