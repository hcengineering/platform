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

import { Calendar, Event } from '@anticrm/calendar'
import { Employee } from '@anticrm/contact'
import type { Domain, Markup, Ref, Timestamp } from '@anticrm/core'
import { IndexKind } from '@anticrm/core'
import { Builder, Collection, Index, Model, Prop, TypeDate, TypeMarkup, TypeString, UX } from '@anticrm/model'
import attachment from '@anticrm/model-attachment'
import chunter from '@anticrm/model-chunter'
import contact from '@anticrm/model-contact'
import core, { TAttachedDoc } from '@anticrm/model-core'
import { TSpaceWithStates } from '@anticrm/model-task'
import workbench from '@anticrm/model-workbench'
import calendar from './plugin'

export * from '@anticrm/calendar'

export const DOMAIN_CALENDAR = 'calendar' as Domain

@Model(calendar.class.Calendar, core.class.Space)
@UX(calendar.string.Calendar, calendar.icon.Calendar)
export class TCalendar extends TSpaceWithStates implements Calendar {}

@Model(calendar.class.Event, core.class.AttachedDoc, DOMAIN_CALENDAR)
export class TEvent extends TAttachedDoc implements Event {
  @Prop(TypeString(), calendar.string.Title)
  @Index(IndexKind.FullText)
  title!: string

  @Prop(TypeString(), calendar.string.EventNumber)
  number!: number

  @Prop(TypeMarkup(), calendar.string.Description)
  @Index(IndexKind.FullText)
  description!: Markup

  @Prop(TypeString(), calendar.string.Location, calendar.icon.Location)
  @Index(IndexKind.FullText)
  location?: string

  @Prop(TypeDate(true), calendar.string.Date)
  date!: Timestamp

  @Prop(TypeDate(true), calendar.string.DueTo)
  dueDate!: Timestamp

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments)
  attachments?: number

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
  comments?: number

  @Prop(Collection(contact.class.Employee), calendar.string.Participants)
  participants!: Ref<Employee>[]
}

export function createModel (builder: Builder): void {
  builder.createModel(TCalendar, TEvent)

  builder.createDoc(workbench.class.Application, core.space.Model, {
    label: calendar.string.ApplicationLabelCalendar,
    icon: calendar.icon.Calendar,
    hidden: true,
    navigatorModel: {
      spaces: [
        {
          label: calendar.string.Calendars,
          spaceClass: calendar.class.Calendar,
          addSpaceLabel: calendar.string.CreateCalendar,
          createComponent: calendar.component.CreateCalendar
        }
      ]
    }
  }, calendar.app.Calendar)
}

export default calendar
