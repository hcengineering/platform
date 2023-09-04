import { MeasureContext, Ref, TxOperations } from '@hcengineering/core'
import task, { DoneState, SpaceWithStates, State } from '@hcengineering/task'
import { findOrUpdate } from './utils'

export async function createUpdateSpaceKanban (
  ctx: MeasureContext,
  spaceId: Ref<SpaceWithStates>,
  client: TxOperations
): Promise<[Ref<State>[], Ref<DoneState>[]]> {
  const rawStates = [
    { color: 9, name: 'Initial' },
    { color: 10, name: 'Intermidiate' },
    { color: 1, name: 'OverIntermidiate' },
    { color: 0, name: 'Done' },
    { color: 11, name: 'Invalid' }
  ]
  const states: Array<Ref<State>> = []
  for (const st of rawStates) {
    const sid = ('generated-' + spaceId + '.state.' + st.name.toLowerCase().replace(' ', '_')) as Ref<State>

    await ctx.with('find-or-update', {}, (ctx) =>
      findOrUpdate(ctx, client, task.space.Statuses, task.class.State, sid, {
        ofAttribute: task.attribute.State,
        name: st.name,
        color: st.color
      })
    )
    states.push(sid)
  }

  const done: Array<Ref<DoneState>> = []

  const doneStates = [
    { class: task.class.WonState, name: 'Won' },
    { class: task.class.LostState, name: 'Lost' }
  ]
  for (const st of doneStates) {
    const sid = `generated-${spaceId}.done-state.${st.name.toLowerCase().replace(' ', '_')}` as Ref<DoneState>
    await ctx.with('gen-done-state', {}, (ctx) =>
      findOrUpdate(ctx, client, task.space.Statuses, st.class, sid, {
        ofAttribute: task.attribute.DoneState,
        name: st.name
      })
    )
    done.push(sid)
  }
  return [states, done]
}
