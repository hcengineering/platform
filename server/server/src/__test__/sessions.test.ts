/* eslint-disable @typescript-eslint/unbound-method */
import { MeasureMetricsContext, type AccountUuid } from '@hcengineering/core'
import { prepapre2SM1EP } from './util2SM1EP'
import core from '@hcengineering/core'
import { ClientConnectionWrapper } from './connection'
import { workspaceRef } from './account'

describe('sessions', () => {
  it('check add session', async () => {
    const ctx = new MeasureMetricsContext('test', {})

    const { newSession, endpointMgr, endpoint2Mgr } = await prepapre2SM1EP(ctx)

    const session = await newSession('user1' as AccountUuid)

    expect(session.sessionId).toBe('s1')
    expect(session.account.uuid).toBe('user1' as AccountUuid)

    expect(endpointMgr.accounts.size).toBe(1)
    expect(endpointMgr.workspaces.size).toBe(3)

    expect(endpointMgr.endpointClients.size).toBe(1)

    expect(endpoint2Mgr.accounts.size).toBe(2)
    expect(endpoint2Mgr.workspaces.size).toBe(2)

    expect(endpointMgr.sessions.size).toBe(1)
    expect(endpoint2Mgr.sessions.size).toBe(1)

    const cc = new ClientConnectionWrapper(endpointMgr, session)

    const r1 = await cc.findAll(core.class.BenchmarkDoc, {})
    expect(r1.length).toBe(3)

    const r2 = await cc.findAll(core.class.BenchmarkDoc, {}, { workspace: workspaceRef.test1.uuid })
    expect(r2.length).toBe(1)

    const r3 = await cc.findAll(core.class.BenchmarkDoc, {}, { workspace: workspaceRef.test2.uuid })
    expect(r3.length).toBe(1)

    const r4 = await cc.findAll(
      core.class.BenchmarkDoc,
      {},
      { workspace: { $in: [workspaceRef.test1.uuid, workspaceRef.test3.uuid] } }
    )
    expect(r4.length).toBe(2)
  })
})
