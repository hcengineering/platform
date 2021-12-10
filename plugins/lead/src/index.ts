//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { plugin } from '@anticrm/platform'
import type { Asset, Plugin } from '@anticrm/platform'
import core, { DoneState } from '@anticrm/core'
import view, { Kanban } from '@anticrm/view'
import type { Class, Data, Doc, DocWithState, Ref, Space, SpaceWithStates, State } from '@anticrm/core'
import type { Contact } from '@anticrm/contact'

/**
 * @public
 */
export interface Funnel extends SpaceWithStates {}

/**
 * @public
 */
export interface Lead extends DocWithState {
  title: string
  customer: Ref<Contact>

  comments?: number
  attachments?: number
}

/**
 * @public
 */
export const leadId = 'lead' as Plugin

export default plugin(leadId, {
  class: {
    Lead: '' as Ref<Class<Lead>>,
    Funnel: '' as Ref<Class<Funnel>>
  },
  icon: {
    Funnel: '' as Asset,
    Lead: '' as Asset,
    LeadApplication: '' as Asset
  }
})

/**
 * @public
 */
export async function createKanban (
  funnelId: Ref<Funnel>,
  factory: <T extends Doc>(_class: Ref<Class<T>>, space: Ref<Space>, data: Data<T>, id: Ref<T>) => Promise<void>
): Promise<void> {
  const states = [
    { color: '#7C6FCD', name: 'Incoming' },
    { color: '#6F7BC5', name: 'Negotation' },
    { color: '#77C07B', name: 'Offer preparing' },
    { color: '#A5D179', name: 'Make a decision' },
    { color: '#F28469', name: 'Contract conclusion' },
    { color: '#7C6FCD', name: 'Done' }
  ]
  const ids: Array<Ref<State>> = []
  for (const st of states) {
    const sid = (funnelId + '.state.' + st.name.toLowerCase().replace(' ', '_')) as Ref<State>
    await factory(
      core.class.State,
      funnelId,
      {
        title: st.name,
        color: st.color
      },
      sid
    )
    ids.push(sid)
  }
  const rawDoneStates = [
    { class: core.class.WonState, title: 'Won' },
    { class: core.class.LostState, title: 'Lost' }
  ]
  const doneStates: Array<Ref<DoneState>> = []
  for (const st of rawDoneStates) {
    const sid = (funnelId + '.done-state.' + st.title.toLowerCase().replace(' ', '_')) as Ref<DoneState>
    await factory(
      st.class,
      funnelId,
      {
        title: st.title
      },
      sid
    )
    doneStates.push(sid)
  }

  await factory(
    view.class.Kanban,
    funnelId,
    {
      attachedTo: funnelId,
      states: ids,
      doneStates,
      order: []
    },
    (funnelId + '.kanban.') as Ref<Kanban>
  )
}
