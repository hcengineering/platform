import { Doc, Tx } from '@hcengineering/core'
import { Execution, MethodParams } from '@hcengineering/process'
import { TriggerControl } from '@hcengineering/server-core'

export type ExecuteFunc = (
  params: MethodParams<Doc>,
  execution: Execution,
  control: TriggerControl
) => Promise<ExecuteResult>

export interface ExecuteResult {
  txes: Tx[]
  rollback: Tx[] | undefined
}

export type TransformFunc = (
  value: any,
  props: Record<string, any>,
  control: TriggerControl,
  execution: Execution
) => Promise<any>
