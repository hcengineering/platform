import automation, { Automation, Command, PerformAutomationProps, TriggerType } from '@anticrm/automation'
import core, { Class, Doc, Ref, Space, TxOperations } from '@anticrm/core'
import { IntlString } from '@anticrm/platform'
import type { Action } from '@anticrm/view'
import view from '@anticrm/view'
import { Trigger } from './models'

export async function createAutomation (
  client: TxOperations,
  name: string,
  trigger: Trigger,
  commands: Array<Command<Doc>>,
  props: { targetClass?: Ref<Class<Doc>>, attachedTo?: Doc } = {}
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
  }

  throw new Error('Unknown automation action')
}

export async function createTrigger (
  client: TxOperations,
  trigger: Trigger,
  space: Ref<Space>,
  automationId: Ref<Automation<Doc>>
): Promise<void> {
  if (trigger.action !== undefined) {
    await client.createDoc<Action<Doc, PerformAutomationProps>>(view.class.Action, space, {
      action: automation.action.PerformAutomation,
      actionProps: {
        automationId,
        automationClass: automation.class.Automation
      },
      category: automation.category.Automation,
      context: { mode: trigger.action.context },
      input: 'any',
      label: trigger.action.label as IntlString,
      target: trigger.action.target
    })
  }

  throw new Error('Unknown automation action')
}
