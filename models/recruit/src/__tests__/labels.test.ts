// Copyright © 2026 Hardcore Engineering Inc.
// Licensed under the Eclipse Public License, Version 2.0

import core from '@hcengineering/core'
import { Builder } from '@hcengineering/model'
import { createModel as createCoreModel } from '@hcengineering/model-core'
import task, { TProject, TTask } from '@hcengineering/model-task'
import tags from '@hcengineering/model-tags'

import recruit from '../plugin'
import { TApplicant, TVacancy } from '../types'

describe('vacancy labels model', () => {
  const builder = new Builder()
  createCoreModel(builder)
  builder.createModel(TTask, TProject, TVacancy, TApplicant)
  const hierarchy = builder.hierarchy

  it('defines vacancy labels as a TagReference collection with the task labels caption', () => {
    const labels = hierarchy.getAttribute(recruit.class.Vacancy, 'labels')

    expect(labels.attributeOf).toBe(recruit.class.Vacancy)
    expect(labels.hidden).not.toBe(true)
    expect(labels.label).toBe(task.string.TaskLabels)
    expect(labels.type).toMatchObject({
      _class: core.class.Collection,
      of: tags.class.TagReference,
      itemLabel: task.string.TaskLabels
    })
  })

  it('keeps applicant labels inherited from Task', () => {
    const labels = hierarchy.getAttribute(recruit.class.Applicant, 'labels')

    expect(labels.attributeOf).toBe(task.class.Task)
    expect(labels.label).toBe(task.string.TaskLabels)
    expect(labels.type).toMatchObject({ _class: core.class.Collection, of: tags.class.TagReference })
    expect(hierarchy.getOwnAttributes(recruit.class.Applicant).has('labels')).toBe(false)
  })

  it('exposes one labels attribute per class and keeps applicants outside the vacancy hierarchy', () => {
    for (const clazz of [recruit.class.Applicant, recruit.class.Vacancy]) {
      const labels = Array.from(hierarchy.getAllAttributes(clazz).values()).filter((attr) => attr.name === 'labels')

      expect(labels).toHaveLength(1)
    }
    expect(hierarchy.getDescendants(recruit.class.Vacancy)).not.toContain(recruit.class.Applicant)
    expect(hierarchy.getDescendants(recruit.class.Applicant)).not.toContain(recruit.class.Vacancy)
    expect(hierarchy.getAttribute(recruit.class.Vacancy, 'labels')._id).not.toBe(
      hierarchy.getAttribute(recruit.class.Applicant, 'labels')._id
    )
  })
})
