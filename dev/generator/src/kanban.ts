import core, { MeasureContext, Ref, Status, TxOperations } from '@hcengineering/core'
import task, { Project } from '@hcengineering/task'
import { findOrUpdate } from './utils'

export async function createUpdateSpaceKanban (
  ctx: MeasureContext,
  spaceId: Ref<Project>,
  client: TxOperations
): Promise<Ref<Status>[]> {
  const rawStates = [
    { color: 9, name: 'Initial' },
    { color: 10, name: 'Intermidiate' },
    { color: 1, name: 'OverIntermidiate' },
    { color: 0, name: 'Done' },
    { color: 11, name: 'Invalid' }
  ]
  const doneStates = [
    { category: task.statusCategory.Won, name: 'Won' },
    { category: task.statusCategory.Lost, name: 'Lost' }
  ]
  const states: Ref<Status>[] = []
  await Promise.all(
    rawStates.map(async (st, i) => {
      const sid = ('generated-' + spaceId + '.state.' + st.name.toLowerCase().replace(' ', '_')) as Ref<Status>

      await ctx.with('find-or-update', {}, (ctx) =>
        findOrUpdate(ctx, client, task.space.Statuses, core.class.Status, sid, {
          ofAttribute: task.attribute.State,
          name: st.name,
          color: st.color,
          category: task.statusCategory.Active
        })
      )
      states.push(sid)
    })
  )

  await Promise.all(
    doneStates.map(async (st, i) => {
      const sid = `generated-${spaceId}.state.${st.name.toLowerCase().replace(' ', '_')}` as Ref<Status>
      await ctx.with('gen-done-state', {}, (ctx) =>
        findOrUpdate(ctx, client, task.space.Statuses, core.class.Status, sid, {
          ofAttribute: task.attribute.State,
          name: st.name,
          category: st.category
        })
      )
      states.push(sid)
    })
  )

  return states
}
