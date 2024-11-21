//
// Copyright © 2024 Hardcore Engineering Inc.
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
import testManagement, { testManagementId, type TestSuite, type TestProject } from '@hcengineering/test-management'
import { type Doc, type Ref } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import {
  getCurrentResolvedLocation,
  getLocation,
  getPanelURI,
  type Location,
  type ResolvedLocation
} from '@hcengineering/ui'
import view, { type ObjectPanel } from '@hcengineering/view'
import { accessDeniedStore } from '@hcengineering/view-resources'

const SUITE_KEY = 'attachedTo'

export function getPanelFragment<T extends Doc> (object: Pick<T, '_class' | '_id'>): string {
  const hierarchy = getClient().getHierarchy()
  const objectPanelMixin = hierarchy.classHierarchyMixin<Doc, ObjectPanel>(object._class, view.mixin.ObjectPanel)
  const component = objectPanelMixin?.component ?? view.component.EditDoc
  return getPanelURI(component, object._id, object._class, 'content')
}

async function generateProjectLocation (
  loc: Location,
  project: Ref<TestProject>
): Promise<ResolvedLocation | undefined> {
  const client = getClient()

  const doc = await client.findOne(testManagement.class.TestProject, { _id: project })
  if (doc === undefined) {
    accessDeniedStore.set(true)
    console.error(`Could not find test project ${project}.`)
    return undefined
  }

  const appComponent = loc.path[0] ?? ''
  const workspace = loc.path[1] ?? ''

  return {
    loc: {
      ...loc,
      path: [appComponent, workspace, testManagementId, project, 'library']
    },
    defaultLocation: {
      ...loc,
      path: [appComponent, workspace, testManagementId, project, 'library']
    }
  }
}

export function getAttachedObjectLink (parentDoc: Ref<Doc>): Location {
  const loc = getCurrentResolvedLocation()
  loc.query = parentDoc === undefined ? undefined : { attachedTo: parentDoc }

  return loc
}

export function getTestSuiteIdFromFragment (fragment: string): Ref<TestSuite> | undefined {
  const props = decodeURIComponent(fragment).split('|')

  return props[6] != null ? (props[6] as Ref<TestSuite>) : undefined
}

export function getTestSuiteIdFromLocation (): Ref<TestSuite> {
  const location = getLocation()
  return (location?.query?.[SUITE_KEY] as Ref<TestSuite>) ?? testManagement.ids.NoParent
}

export async function resolveLocation (loc: Location): Promise<ResolvedLocation | undefined> {
  if (loc.path[2] !== testManagementId) {
    return undefined
  }

  const projectId = loc.path[3] as Ref<TestProject>
  if (projectId !== undefined) {
    return await generateProjectLocation(loc, projectId)
  }
  return undefined
}
