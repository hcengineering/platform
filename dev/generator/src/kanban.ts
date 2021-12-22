
import { MeasureContext, Ref, TxOperations } from '@anticrm/core'
import task, { DoneState, genRanks, Kanban, SpaceWithStates, State } from '@anticrm/task'
import { findOrUpdate } from './utils'

export async function createUpdateSpaceKanban (ctx: MeasureContext, spaceId: Ref<SpaceWithStates>, client: TxOperations): Promise<Ref<State>[]> {
  const rawStates = [
    { color: '#7C6FCD', name: 'Initial' },
    { color: '#6F7BC5', name: 'Intermidiate' },
    { color: '#77C07B', name: 'OverIntermidiate' },
    { color: '#A5D179', name: 'Done' },
    { color: '#F28469', name: 'Invalid' }
  ]
  const states: Array<Ref<State>> = []
  const stateRanks = genRanks(rawStates.length)
  for (const st of rawStates) {
    const rank = stateRanks.next().value

    if (rank === undefined) {
      console.error('Failed to generate rank')
      break
    }

    const sid = ('generated-' + spaceId + '.state.' + st.name.toLowerCase().replace(' ', '_')) as Ref<State>

    await ctx.with('find-or-update', {}, (ctx) => findOrUpdate(ctx, client, spaceId, task.class.State,
      sid,
      {
        title: st.name,
        color: st.color,
        rank
      }
    ))
    states.push(sid)
  }

  const doneStates = [
    { class: task.class.WonState, title: 'Won' },
    { class: task.class.LostState, title: 'Lost' }
  ]
  const doneStateRanks = genRanks(doneStates.length)
  for (const st of doneStates) {
    const rank = doneStateRanks.next().value

    if (rank === undefined) {
      console.error('Failed to generate rank')
      break
    }

    const sid = ('generated-' + spaceId + '.done-state.' + st.title.toLowerCase().replace(' ', '_')) as Ref<DoneState>
    await ctx.with('gen-done-state', {}, (ctx) => findOrUpdate(ctx, client, spaceId, st.class,
      sid,
      {
        title: st.title,
        rank
      }
    ))
  }

  await ctx.with('create-kanban', {}, (ctx) => findOrUpdate(ctx, client, spaceId, task.class.Kanban,
    ('generated-' + spaceId + '.kanban') as Ref<Kanban>,
    {
      attachedTo: spaceId
    }
  ))
  return states
}
