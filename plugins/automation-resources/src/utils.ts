import automation, {
  Automation,
  Command,
  isUpdateDocCommand,
  PerformAutomationProps,
  TriggerType
} from '@hcengineering/automation'
import core, { Class, Doc, Ref, Space, TxOperations } from '@hcengineering/core'
import { IntlString } from '@hcengineering/platform'
import { getClient } from '@hcengineering/presentation'
import view, { Action } from '@hcengineering/view'
import { Trigger } from './models'

export async function createAutomation (
  client: TxOperations,
  name: string,
  trigger: Trigger,
  commands: Array<Command<Doc>>,
  props: { targetClass?: Ref<Class<Doc>>, attachedTo?: Doc, description?: string } = {}
): Promise<Ref<Automation<Doc>>> {
  let space: Ref<Space> = automation.space.Automation
  let attachedTo: Ref<Doc> = automation.space.Automation
  let attachedToClass: Ref<Class<Doc>> = core.class.Space
  const collection = 'automations'
  if (props.attachedTo !== undefined) {
    space = props.attachedTo.space
    attachedTo = props.attachedTo._id
    attachedToClass = props.attachedTo._class
  }
  const automationId = await client.addCollection(
    automation.class.Automation,
    space,
    attachedTo,
    attachedToClass,
    collection,
    {
      name,
      description: null,
      targetClass: props.targetClass ?? null,
      trigger: {
        type: getTriggerType(trigger)
      },
      commands
    }
  )
  await createTrigger(client, trigger, space, automationId)
  return automationId
}

export function getTriggerType (trigger: Trigger): TriggerType {
  if (trigger.action !== undefined) {
    return TriggerType.Action
  } else {
    throw new Error('Unknown automation trigger')
  }
}

export async function createTrigger (
  client: TxOperations,
  trigger: Trigger,
  space: Ref<Space>,
  automationId: Ref<Automation<Doc>>
): Promise<Doc | undefined> {
  if (trigger.action !== undefined) {
    const triggerId = await client.createDoc<Action<Doc, PerformAutomationProps>>(view.class.Action, core.space.Model, {
      action: automation.action.PerformAutomation,
      actionProps: {
        automationId,
        automationClass: automation.class.Automation
      },
      category: automation.category.Automation,
      context: { mode: trigger.action.context },
      icon: trigger.action.icon,
      input: 'any',
      label: trigger.action.label as IntlString,
      target: trigger.action.target
    })
    return await client.findOne<Action<Doc, PerformAutomationProps>>(view.class.Action, { _id: triggerId })
  } else {
    throw new Error('Unknown automation trigger')
  }
}

export async function performAutomation (
  doc: Doc | Doc[] | undefined,
  evt: Event,
  props: PerformAutomationProps | undefined
): Promise<void> {
  if (doc === undefined || props?.automationId === undefined) {
    throw new Error('Unknown automation action')
  }
  const client = getClient()
  const automationObj = await client.findOne(props.automationClass ?? automation.class.Automation, {
    _id: props.automationId
  })
  if (automationObj === undefined) {
    return
  }

  let objects = []
  if (Array.isArray(doc)) {
    objects = doc
  } else {
    objects = [doc]
  }

  await doPerformAutomation(client, objects, automationObj)
}

async function doPerformAutomation (client: TxOperations, docs: Doc[], automationObj: Automation<Doc>): Promise<void> {
  // TODO: move to automation server
  const hierarchy = client.getHierarchy()
  for (const doc of docs) {
    for (const command of automationObj.commands) {
      if (isUpdateDocCommand(command) && hierarchy.isDerived(doc._class, command.targetClass)) {
        await client.update(doc, command.update)
      }
    }
  }
}
