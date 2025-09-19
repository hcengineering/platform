import { Card } from '@hcengineering/card'
import { Doc, MeasureContext, PersonId, Ref, Tx, TxOperations } from '@hcengineering/core'
import { Execution, ExecutionError, MethodParams, Trigger, UserResult } from '@hcengineering/process'

export type ExecuteFunc = (
  params: MethodParams<Doc>,
  execution: Execution,
  control: ProcessControl,
  results: UserResult[] | undefined
) => Promise<ExecuteResult>

export type ExecuteResult = SuccessExecutionResult | ExecutionError

export interface SuccessExecutionResult {
  txes: Tx[]
  rollback: Tx[] | undefined
  context: SuccessExecutionContext[] | null
}

export interface SuccessExecutionContext {
  _id: string
  value: any
}

export type TransformFunc = (
  value: any,
  props: Record<string, any>,
  control: ProcessControl,
  execution: Execution
) => Promise<any>

export interface ProcessMessage {
  account: PersonId
  event: Ref<Trigger>
  context: Record<string, any>
  execution?: Ref<Execution>
  card?: Ref<Card>
}

export interface ProcessControl {
  ctx: MeasureContext
  client: TxOperations
  cache: Map<string, any>
  messageContext: Record<string, any>
}

export type RollbackFunc = (context: Record<string, any>, control: ProcessControl) => Tx
