import { MeasureContext, Ref, TxOperations } from '@hcengineering/core'
import task, { DoneState, genRanks, Kanban, SpaceWithStates, State } from '@hcengineering/task'
import { findOrUpdate } from './utils'

export async function createUpdateSpaceKanban (
  ctx: MeasureContext,
  spaceId: Ref<SpaceWithStates>,
  client: TxOperations
): Promise<Ref<State>[]> {
  const rawStates = [
    { color: 9, name: 'Initial' },
    { color: 10, name: 'Intermidiate' },
    { color: 1, name: 'OverIntermidiate' },
    { color: 0, name: 'Done' },
    { color: 11, name: 'Invalid' }
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

    await ctx.with('find-or-update', {}, (ctx) =>
      findOrUpdate(ctx, client, spaceId, task.class.State, sid, {
        ofAttribute: task.attribute.State,
        name: st.name,
        color: st.color,
        rank
      })
    )
    states.push(sid)
  }

  const doneStates = [
    { class: task.class.WonState, name: 'Won' },
    { class: task.class.LostState, name: 'Lost' }
  ]
  const doneStateRanks = genRanks(doneStates.length)
  for (const st of doneStates) {
    const rank = doneStateRanks.next().value

    if (rank === undefined) {
      console.error('Failed to generate rank')
      break
    }

    const sid = `generated-${spaceId}.done-state.${st.name.toLowerCase().replace(' ', '_')}` as Ref<DoneState>
    await ctx.with('gen-done-state', {}, (ctx) =>
      findOrUpdate(ctx, client, spaceId, st.class, sid, {
        ofAttribute: task.attribute.DoneState,
        name: st.name,
        rank
      })
    )
  }

  await ctx.with('create-kanban', {}, (ctx) =>
    findOrUpdate(ctx, client, spaceId, task.class.Kanban, ('generated-' + spaceId + '.kanban') as Ref<Kanban>, {
      attachedTo: spaceId
    })
  )
  return states
}
