<!--
//
// Copyright © 2026 TraceX SAS.
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
-->
<script lang="ts">
  import type { WorkspaceAuditEvent } from '@hcengineering/account-client'
  import { BooleanIcon, DateTimePresenter, Expandable, Label, Modal, StateTag } from '@hcengineering/ui'
  import {
    AUDIT_ATTRIBUTE_LABELS,
    AUDIT_OUTCOME_LABELS,
    AUDIT_OUTCOME_TYPES,
    getAuditEventLabel,
    getAuditRoleLabel,
    getAuditTarget
  } from '../../audit'
  import setting from '../../plugin'
  import { clearSettingsStore } from '../../store'
  import AuditIdentity from './AuditIdentity.svelte'

  export let event: WorkspaceAuditEvent
  export let noTopIndent: boolean = false

  $: target = getAuditTarget(event)
  $: attributes = Object.entries(event.attributes).filter(([key]) => AUDIT_ATTRIBUTE_LABELS[key] !== undefined)
  $: technicalAttributes = Object.entries(event.attributes).filter(([key]) => AUDIT_ATTRIBUTE_LABELS[key] === undefined)
</script>

<Modal
  type="type-aside"
  label={setting.string.EventDetails}
  hideFooter
  {noTopIndent}
  onCancel={clearSettingsStore}
  padding="var(--spacing-3)"
>
  <div class="flex-col flex-gap-4">
    <div class="flex-col flex-gap-2">
      <span class="font-medium">
        <Label label={getAuditEventLabel(event.event)} />
        {#if getAuditEventLabel(event.event) === setting.string.UnknownEvent}
          ({event.event}){/if}
      </span>
      <StateTag type={AUDIT_OUTCOME_TYPES[event.outcome]} label={AUDIT_OUTCOME_LABELS[event.outcome]} />
    </div>
    <dl class="fields">
      <dt><Label label={setting.string.Time} /></dt>
      <dd><DateTimePresenter value={event.occurredAt} /></dd>
      <dt><Label label={setting.string.Actor} /></dt>
      <dd><AuditIdentity account={event.actorAccountUuid} service={event.actorService} /></dd>
      {#if target}
        <dt><Label label={setting.string.Target} /></dt>
        <dd><AuditIdentity account={target} /></dd>
      {/if}
      {#each attributes as [key, value] (key)}
        <dt><Label label={AUDIT_ATTRIBUTE_LABELS[key]} /></dt>
        <dd class="field-value">
          {#if typeof value === 'boolean'}<BooleanIcon {value} />
          {:else if key === 'role' || key === 'targetRole'}<Label label={getAuditRoleLabel(String(value))} />
          {:else}{value === null ? '—' : Array.isArray(value) ? value.join(', ') : String(value)}{/if}
        </dd>
      {/each}
    </dl>
    <Expandable expanded={false} bordered={false}>
      <svelte:fragment slot="title"><Label label={setting.string.TechnicalDetails} /></svelte:fragment>
      <dl class="fields select-text mt-2">
        <dt><Label label={setting.string.Event} /></dt>
        <dd class="field-value">{event.event}</dd>
        <dt><Label label={setting.string.Time} /></dt>
        <dd>{new Date(event.occurredAt).toISOString()}</dd>
        <dt><Label label={setting.string.EventId} /></dt>
        <dd class="field-value">{event.eventId}</dd>
        <dt><Label label={setting.string.SourceService} /></dt>
        <dd class="field-value">{event.sourceService}</dd>
        {#if event.targetType}
          <dt>targetType</dt>
          <dd class="field-value">{event.targetType}</dd>
        {/if}
        {#if event.targetId}
          <dt>targetId</dt>
          <dd class="field-value">{event.targetId}</dd>
        {/if}
        {#if event.operationId}
          <dt><Label label={setting.string.OperationId} /></dt>
          <dd class="field-value">{event.operationId}</dd>
        {/if}
        {#each technicalAttributes as [key, value] (key)}
          <dt>{key}</dt>
          <dd class="field-value">{value === null ? '—' : Array.isArray(value) ? value.join(', ') : String(value)}</dd>
        {/each}
      </dl>
    </Expandable>
  </div>
</Modal>

<style lang="scss">
  .field-value {
    overflow-wrap: anywhere;
  }

  .fields {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
    gap: var(--spacing-2) var(--spacing-3);
    margin: 0;
    dt {
      color: var(--theme-dark-color);
    }
    dd {
      margin: 0;
      min-width: 0;
    }
  }
</style>
