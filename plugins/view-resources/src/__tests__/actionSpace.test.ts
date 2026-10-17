//
// Copyright © 2026 Hardcore Engineering Inc.
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

import { type Ref, type Space } from '@hcengineering/core'
import { withCurrentSpace } from '../actionSpace'

const project = 'project-1' as Ref<Space>

describe('withCurrentSpace', () => {
  test('adds props.space when the action has no props', () => {
    const actionProps = { component: 'tracker:component:CreateIssue', element: 'top' }
    expect(withCurrentSpace(actionProps, project)).toEqual({
      component: 'tracker:component:CreateIssue',
      element: 'top',
      props: { space: project }
    })
    expect(actionProps).not.toHaveProperty('props')
  })

  test('keeps existing props and does not mutate the model action props', () => {
    const actionProps = { component: 'c', props: { kind: 'x' } }
    const result = withCurrentSpace(actionProps, project)
    expect(result.props).toEqual({ kind: 'x', space: project })
    expect(actionProps.props).toEqual({ kind: 'x' })
    expect(result.props).not.toBe(actionProps.props)
  })

  test('works without action props and without a current space', () => {
    expect(withCurrentSpace(undefined, undefined)).toEqual({ props: { space: undefined } })
  })
})
