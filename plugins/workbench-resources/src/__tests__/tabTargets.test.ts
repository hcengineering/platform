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

import { isTabOfRemovedDoc } from '../tabTargets'

const docId = '6835a1b2c3d4e5f6a7b8c9d0'
const otherId = '6835a1b2c3d4e5f6a7b8c9ff'

describe('isTabOfRemovedDoc', () => {
  it('matches a document id in the path', () => {
    expect(isTabOfRemovedDoc(`/workbench/ws/card/${docId}`, new Set([docId]))).toBe(true)
  })

  it('matches a link id ending with the document id', () => {
    expect(isTabOfRemovedDoc(`/workbench/ws/document/my-page-${docId}`, new Set([docId]))).toBe(true)
  })

  it('matches a document id in an encoded fragment', () => {
    const fragment = encodeURIComponent(`view:component:EditDoc|${docId}|contact:class:Person|content`)
    expect(isTabOfRemovedDoc(`/workbench/ws/contacts#${fragment}`, new Set([docId]))).toBe(true)
  })

  it('matches by the resolved target when the location uses another link id', () => {
    expect(isTabOfRemovedDoc('/workbench/ws/tracker/TSK-1', new Set([docId]), docId)).toBe(true)
    expect(isTabOfRemovedDoc('/workbench/ws/tracker/TSK-1', new Set([docId]), otherId)).toBe(false)
  })

  it('does not match tabs of other documents or without a document', () => {
    expect(isTabOfRemovedDoc(`/workbench/ws/card/${otherId}`, new Set([docId]))).toBe(false)
    expect(isTabOfRemovedDoc(`/workbench/ws/document/my-page-${docId}0`, new Set([docId]))).toBe(false)
    expect(isTabOfRemovedDoc('/workbench/ws/inbox', new Set([docId]))).toBe(false)
    expect(isTabOfRemovedDoc(`/workbench/ws/card/${docId}`, new Set())).toBe(false)
  })

  it('tolerates malformed encoding', () => {
    expect(isTabOfRemovedDoc(`/workbench/ws/card/${docId}#%E0%A4%A`, new Set([docId]))).toBe(true)
  })
})
