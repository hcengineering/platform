//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { type Class, type Doc, type Hierarchy, type Ref, type PersonId } from '@hcengineering/core'
import trackerPlugin, { type Component, type IssueStatus, type Milestone, type Project } from '@hcengineering/tracker'
import { type AttributeModel } from '@hcengineering/view'
import { getClient } from '@hcengineering/presentation'
import { getName, getPersonByPersonId } from '@hcengineering/contact'

/**
 * Cache for IssueStatus ID -> name mappings to reduce database calls
 */
const statusCache = new Map<Ref<IssueStatus>, string>()

/**
 * Load IssueStatus name from status reference with caching support
 */
async function loadStatusName (statusRef: Ref<IssueStatus>): Promise<string> {
  // Check cache first
  const cachedName = statusCache.get(statusRef)
  if (cachedName !== undefined) {
    return cachedName
  }

  try {
    const client = getClient()
    const status = await client.findOne(trackerPlugin.class.IssueStatus, { _id: statusRef })
    if (status !== undefined && status !== null) {
      const name = status.name ?? String(statusRef)
      // Store in cache
      statusCache.set(statusRef, name)
      return name
    }
  } catch (error) {
    console.warn('Failed to lookup IssueStatus name for:', statusRef, error)
  }

  // Return original reference if lookup failed
  return String(statusRef)
}

/**
 * Cache for Component ID -> label mappings to reduce database calls
 */
const componentCache = new Map<Ref<Component>, string>()

/**
 * Load Component label from component reference with caching support
 */
async function loadComponentLabel (componentRef: Ref<Component>): Promise<string> {
  // Check cache first
  const cachedLabel = componentCache.get(componentRef)
  if (cachedLabel !== undefined) {
    return cachedLabel
  }

  try {
    const client = getClient()
    const component = await client.findOne(trackerPlugin.class.Component, { _id: componentRef })
    if (component !== undefined && component !== null) {
      const label = component.label ?? String(componentRef)
      // Store in cache
      componentCache.set(componentRef, label)
      return label
    }
  } catch (error) {
    console.warn('Failed to lookup Component label for:', componentRef, error)
  }

  // Return original reference if lookup failed
  return String(componentRef)
}

/**
 * Cache for Project ID -> name mappings to reduce database calls
 */
const projectCache = new Map<Ref<Project>, string>()

/**
 * Load Project name from project reference with caching support
 */
async function loadProjectName (projectRef: Ref<Project>): Promise<string> {
  // Check cache first
  const cachedName = projectCache.get(projectRef)
  if (cachedName !== undefined) {
    return cachedName
  }

  try {
    const client = getClient()
    const project = await client.findOne(trackerPlugin.class.Project, { _id: projectRef })
    if (project !== undefined && project !== null) {
      const name = project.name ?? String(projectRef)
      // Store in cache
      projectCache.set(projectRef, name)
      return name
    }
  } catch (error) {
    console.warn('Failed to lookup Project name for:', projectRef, error)
  }

  // Return original reference if lookup failed
  return String(projectRef)
}

/**
 * Cache for Milestone ID -> label mappings to reduce database calls
 */
const milestoneCache = new Map<Ref<Milestone>, string>()

/**
 * Load Milestone label from milestone reference with caching support
 */
async function loadMilestoneLabel (milestoneRef: Ref<Milestone>): Promise<string> {
  // Check cache first
  const cachedLabel = milestoneCache.get(milestoneRef)
  if (cachedLabel !== undefined) {
    return cachedLabel
  }

  try {
    const client = getClient()
    const milestone = await client.findOne(trackerPlugin.class.Milestone, { _id: milestoneRef })
    if (milestone !== undefined && milestone !== null) {
      const label = milestone.label ?? String(milestoneRef)
      // Store in cache
      milestoneCache.set(milestoneRef, label)
      return label
    }
  } catch (error) {
    console.warn('Failed to lookup Milestone label for:', milestoneRef, error)
  }

  // Return original reference if lookup failed
  return String(milestoneRef)
}

/**
 * Cache for Person ID -> name mappings to reduce database calls
 */
const personCache = new Map<PersonId, string>()

/**
 * Load person name from PersonId with caching support
 */
async function loadPersonName (personId: PersonId): Promise<string> {
  // Check cache first
  const cachedName = personCache.get(personId)
  if (cachedName !== undefined) {
    return cachedName
  }

  try {
    const client = getClient()
    const person = await getPersonByPersonId(client, personId)
    if (person !== undefined && person !== null) {
      const name = getName(client.getHierarchy(), person)
      // Store in cache
      personCache.set(personId, name)
      return name
    }
  } catch (error) {
    console.warn('Failed to lookup person name for:', personId, error)
  }

  // Return original ID if lookup failed
  return String(personId)
}

/**
 * Value formatter for issue fields
 * Handles special cases for status, assignee, component, space (project), and milestone fields
 */
export async function formatIssueValue (
  attr: AttributeModel,
  card: Doc,
  hierarchy: Hierarchy,
  _class: Ref<Class<Doc>>,
  language: string | undefined
): Promise<string | undefined> {
  // Check if this is an Issue class
  const isIssueClass = hierarchy.isDerived(_class, trackerPlugin.class.Issue)
  if (!isIssueClass) {
    return undefined
  }

  const issueDoc = card as unknown as Record<string, unknown>

  // Handle status field - format IssueStatus ID to name
  if (attr.key === 'status') {
    const statusValue: unknown = issueDoc.status
    if (statusValue !== undefined && statusValue !== null) {
      // Check if status is in lookup
      const issueWithLookup = issueDoc as Record<string, unknown> & { $lookup?: Record<string, unknown> }
      const lookupStatus: unknown = issueWithLookup.$lookup?.status
      if (lookupStatus !== undefined && lookupStatus !== null) {
        const statusObj = lookupStatus as Record<string, unknown>
        const statusName: unknown = statusObj.name
        if (typeof statusName === 'string') {
          return statusName
        }
      }
      // If not in lookup, fetch it
      if (typeof statusValue === 'string') {
        return await loadStatusName(statusValue as Ref<IssueStatus>)
      }
    }
    return ''
  }

  // Handle assignee field - format PersonId to person name
  if (attr.key === 'assignee') {
    const assigneeValue: unknown = issueDoc.assignee
    if (assigneeValue !== undefined && assigneeValue !== null) {
      // Check if assignee is in lookup
      const issueWithLookup = issueDoc as Record<string, unknown> & { $lookup?: Record<string, unknown> }
      const lookupAssignee: unknown = issueWithLookup.$lookup?.assignee
      if (lookupAssignee !== undefined && lookupAssignee !== null) {
        const assigneeObj = lookupAssignee as Record<string, unknown>
        const assigneeName: unknown = assigneeObj.name
        if (typeof assigneeName === 'string') {
          return assigneeName
        }
      }
      // If not in lookup, fetch it
      if (typeof assigneeValue === 'string') {
        return await loadPersonName(assigneeValue as PersonId)
      }
    }
    return ''
  }

  // Handle component field - format Component ID to label
  if (attr.key === 'component') {
    const componentValue: unknown = issueDoc.component
    if (componentValue !== undefined && componentValue !== null) {
      // Check if component is in lookup
      const issueWithLookup = issueDoc as Record<string, unknown> & { $lookup?: Record<string, unknown> }
      const lookupComponent: unknown = issueWithLookup.$lookup?.component
      if (lookupComponent !== undefined && lookupComponent !== null) {
        const componentObj = lookupComponent as Record<string, unknown>
        const componentLabel: unknown = componentObj.label
        if (typeof componentLabel === 'string') {
          return componentLabel
        }
      }
      // If not in lookup, fetch it
      if (typeof componentValue === 'string') {
        return await loadComponentLabel(componentValue as Ref<Component>)
      }
    }
    return ''
  }

  // Handle space field (Project) - format Project ID to name
  if (attr.key === 'space') {
    const spaceValue: unknown = issueDoc.space
    if (spaceValue !== undefined && spaceValue !== null) {
      // Check if space is in lookup
      const issueWithLookup = issueDoc as Record<string, unknown> & { $lookup?: Record<string, unknown> }
      const lookupSpace: unknown = issueWithLookup.$lookup?.space
      if (lookupSpace !== undefined && lookupSpace !== null) {
        const spaceObj = lookupSpace as Record<string, unknown>
        const spaceName: unknown = spaceObj.name
        if (typeof spaceName === 'string') {
          return spaceName
        }
      }
      // If not in lookup, fetch it
      if (typeof spaceValue === 'string') {
        return await loadProjectName(spaceValue as Ref<Project>)
      }
    }
    return ''
  }

  // Handle milestone field - format Milestone ID to label
  if (attr.key === 'milestone') {
    const milestoneValue: unknown = issueDoc.milestone
    if (milestoneValue !== undefined && milestoneValue !== null) {
      // Check if milestone is in lookup
      const issueWithLookup = issueDoc as Record<string, unknown> & { $lookup?: Record<string, unknown> }
      const lookupMilestone: unknown = issueWithLookup.$lookup?.milestone
      if (lookupMilestone !== undefined && lookupMilestone !== null) {
        const milestoneObj = lookupMilestone as Record<string, unknown>
        const milestoneLabel: unknown = milestoneObj.label
        if (typeof milestoneLabel === 'string') {
          return milestoneLabel
        }
      }
      // If not in lookup, fetch it
      if (typeof milestoneValue === 'string') {
        return await loadMilestoneLabel(milestoneValue as Ref<Milestone>)
      }
    }
    return ''
  }

  return undefined
}

// Formatter is registered via MarkdownValueFormatter mixin in models/tracker
