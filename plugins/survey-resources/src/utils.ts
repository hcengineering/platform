import { type Class, type Doc, type Ref } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import { type Location, type ResolvedLocation, getPanelURI } from '@hcengineering/ui'
import { accessDeniedStore } from '@hcengineering/view-resources'
import view from '@hcengineering/view'
import survey, { surveyId, type Survey } from '@hcengineering/survey'

export function hasText (value: string | undefined | null): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

export async function generateLocation (loc: Location, id: Ref<Survey>): Promise<ResolvedLocation | undefined> {
  const client = getClient()

  const surv = await client.findOne(survey.class.Survey, { _id: id })
  if (surv === undefined) {
    accessDeniedStore.set(true)
    console.error(`Could not find document ${id}.`)
    return undefined
  }

  const appComponent = loc.path[0] ?? ''
  const workspace = loc.path[1] ?? ''

  const objectPanel = client.getHierarchy().classHierarchyMixin(surv._class as Ref<Class<Doc>>, view.mixin.ObjectPanel)
  const component = objectPanel?.component ?? view.component.EditDoc

  return {
    loc: {
      path: [appComponent, workspace, surveyId],
      fragment: getPanelURI(component, surv._id, surv._class, 'content')
    },
    defaultLocation: {
      path: [appComponent, workspace, surveyId],
      fragment: getPanelURI(component, surv._id, surv._class, 'content')
    }
  }
}

export async function resolveLocation (loc: Location): Promise<ResolvedLocation | undefined> {
  // if (loc.path[2] !== surveyId) {
  //   return undefined
  // }

  // const id = loc.path[3] as Ref<Survey>
  // if (id !== undefined) {
  //   return await generateLocation(loc, id)
  // }

  return undefined
}
