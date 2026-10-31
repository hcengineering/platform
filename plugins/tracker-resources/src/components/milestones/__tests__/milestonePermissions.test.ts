//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { PermissionsStore } from '@hcengineering/contact'
import type { Permission, Ref } from '@hcengineering/core'
import type { Project } from '@hcengineering/tracker'
import { canCreateMilestone, canSaveMilestone } from '../milestonePermissions'

jest.mock('@hcengineering/view-resources', () => jest.requireActual('../../../../../view-resources/src/permissions'))
jest.mock('@hcengineering/platform', () => ({
  ...jest.requireActual('@hcengineering/platform'),
  getMetadata: jest.fn()
}))
jest.mock('@hcengineering/presentation', () => ({
  getClient: () => ({
    getHierarchy: () => ({ getAncestors: (objectClass: string) => [objectClass] }),
    getModel: () => ({
      findAllSync: (_class: string, query: { txClass: string }) =>
        query.txClass === 'core:class:TxCreateDoc'
          ? [
              {
                _id: 'allow-milestone',
                objectClass: 'tracker:class:Milestone'
              },
              {
                _id: 'forbid-milestone',
                objectClass: 'tracker:class:Milestone',
                forbid: true
              }
            ]
          : []
    })
  })
}))
jest.mock('../../../plugin', () => ({
  __esModule: true,
  default: { class: { Milestone: 'tracker:class:Milestone' } }
}))

const project = 'project' as Ref<Project>
const otherProject = 'other-project' as Ref<Project>

function permissions (permission?: string, restricted: boolean = false): PermissionsStore {
  return {
    ps: permission === undefined ? {} : { [project]: new Set([permission as Ref<Permission>]) },
    ap: {},
    ms: {},
    whitelist: new Set(),
    restrictedSpaces: new Set(restricted ? [project] : [])
  }
}

describe('milestone creation permissions', () => {
  it('offers creation to a permitted user in a restricted project', () => {
    expect(canCreateMilestone(project, true, false, permissions('allow-milestone', true))).toBe(true)
  })

  it('hides creation from a forbidden user even in an unrestricted project', () => {
    expect(canCreateMilestone(project, true, false, permissions('forbid-milestone'))).toBe(false)
  })

  it('hides creation in a restricted project without a creation grant', () => {
    const store = permissions(undefined, true)
    store.ps[project] = new Set()
    expect(canCreateMilestone(project, true, false, store)).toBe(false)
  })

  it('appears after permissions load and disappears when permission is revoked', () => {
    expect(canCreateMilestone(project, true, false, permissions())).toBe(false)
    expect(canCreateMilestone(project, true, false, permissions('allow-milestone', true))).toBe(true)
    expect(canCreateMilestone(project, true, false, permissions('forbid-milestone', true))).toBe(false)
  })

  it('does not carry permission over to another project', () => {
    expect(canCreateMilestone(otherProject, true, false, permissions('allow-milestone'))).toBe(false)
  })

  it('allows creation in a whitelisted project', () => {
    const store = permissions()
    store.whitelist.add(project)
    expect(canCreateMilestone(project, true, false, store)).toBe(true)
  })

  it('requires an editable selector bound to a single project outside action mode', () => {
    const store = permissions('allow-milestone')
    expect(canCreateMilestone(project, false, false, store)).toBe(false)
    expect(canCreateMilestone(project, true, true, store)).toBe(false)
    expect(canCreateMilestone(undefined, true, false, store)).toBe(false)
    expect(canCreateMilestone({ $in: [project, otherProject] }, true, false, store)).toBe(false)
  })
})

describe('milestone dialog save permissions', () => {
  it('requires a label even when the user may create milestones', () => {
    const store = permissions('allow-milestone', true)
    expect(canSaveMilestone(project, '', store)).toBe(false)
    expect(canSaveMilestone(project, 'Release', store)).toBe(true)
  })

  it('disables saving when the dialog switches to a forbidden project and enables it on return', () => {
    const store = permissions('allow-milestone', true)
    store.ps[otherProject] = new Set(['forbid-milestone' as Ref<Permission>])
    expect(canSaveMilestone(project, 'Release', store)).toBe(true)
    expect(canSaveMilestone(otherProject, 'Release', store)).toBe(false)
    expect(canSaveMilestone(project, 'Release', store)).toBe(true)
  })

  it('waits for permissions and disables saving when permission is revoked', () => {
    expect(canSaveMilestone(project, 'Release', permissions())).toBe(false)
    expect(canSaveMilestone(project, 'Release', permissions('allow-milestone', true))).toBe(true)
    expect(canSaveMilestone(project, 'Release', permissions('forbid-milestone', true))).toBe(false)
  })
})
