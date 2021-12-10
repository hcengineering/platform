import core, { Ref, SpaceWithStates, State, TxOperations } from '@anticrm/core'
import { findOrUpdate } from './utils'
import view, { Kanban } from '@anticrm/view'

export async function createUpdateSpaceKanban (spaceId: Ref<SpaceWithStates>, client: TxOperations): Promise<Ref<State>[]> {
  const states = [
    { color: '#7C6FCD', name: 'Initial' },
    { color: '#6F7BC5', name: 'Intermidiate' },
    { color: '#77C07B', name: 'OverIntermidiate' },
    { color: '#A5D179', name: 'Done' },
    { color: '#F28469', name: 'Invalid' }
  ]
  const ids: Array<Ref<State>> = []
  for (const st of states) {
    const sid = ('generated-' + spaceId + '.state.' + st.name.toLowerCase().replace(' ', '_')) as Ref<State>
    await findOrUpdate(client, spaceId, core.class.State,
      sid,
      {
        title: st.name,
        color: st.color
      }
    )
    ids.push(sid)
  }

  await findOrUpdate(client, spaceId,
    view.class.Kanban,
    ('generated-' + spaceId + '.kanban') as Ref<Kanban>,
    {
      attachedTo: spaceId,
      states: ids,
      order: []
    }
  )
  return ids
}
