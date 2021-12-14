import core, { DoneState, Ref, SpaceWithStates, State, TxOperations } from '@anticrm/core'
import { findOrUpdate } from './utils'
import view, { Kanban } from '@anticrm/view'

export async function createUpdateSpaceKanban (spaceId: Ref<SpaceWithStates>, client: TxOperations): Promise<Ref<State>[]> {
  const rawStates = [
    { color: '#7C6FCD', name: 'Initial' },
    { color: '#6F7BC5', name: 'Intermidiate' },
    { color: '#77C07B', name: 'OverIntermidiate' },
    { color: '#A5D179', name: 'Done' },
    { color: '#F28469', name: 'Invalid' }
  ]
  const states: Array<Ref<State>> = []
  for (const st of rawStates) {
    const sid = ('generated-' + spaceId + '.state.' + st.name.toLowerCase().replace(' ', '_')) as Ref<State>
    await findOrUpdate(client, spaceId, core.class.State,
      sid,
      {
        title: st.name,
        color: st.color
      }
    )
    states.push(sid)
  }

  const rawDoneStates = [
    { class: core.class.WonState, title: 'Won' },
    { class: core.class.LostState, title: 'Lost' }
  ]
  const doneStates: Array<Ref<DoneState>> = []
  for (const st of rawDoneStates) {
    const sid = ('generated-' + spaceId + '.done-state.' + st.title.toLowerCase().replace(' ', '_')) as Ref<DoneState>
    await findOrUpdate(client, spaceId, st.class,
      sid,
      {
        title: st.title
      }
    )
    doneStates.push(sid)
  }

  await findOrUpdate(client, spaceId,
    view.class.Kanban,
    ('generated-' + spaceId + '.kanban') as Ref<Kanban>,
    {
      attachedTo: spaceId,
      states,
      doneStates,
      order: []
    }
  )
  return states
}
