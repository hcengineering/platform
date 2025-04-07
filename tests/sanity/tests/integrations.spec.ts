import { expect, test } from '@playwright/test'
import { faker } from '@faker-js/faker'
import { Integration, IntegrationSecret } from '@hcengineering/account'
import { buildSocialIdString, SocialIdType, WorkspaceUuid } from '@hcengineering/core'

import { PlatformUser } from './utils'
import { getAdminAccountClient } from './API/AccountClient'

test.describe('integrations in accounts tests', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => { console.log(msg.text()) })
  })

  test('manage integrations', async () => {
    const accountClient = await getAdminAccountClient()

    const personUuid = await accountClient.findPersonBySocialKey(buildSocialIdString({ type: SocialIdType.EMAIL, value: PlatformUser }))
    if (personUuid == null) {
      throw new Error('Failed to find person for PlatformUser: ' + PlatformUser)
    }

    const personId1 = await accountClient.addSocialIdToPerson(personUuid, SocialIdType.EMAIL, faker.word.words(1), true)
    const personId2 = await accountClient.addSocialIdToPerson(personUuid, SocialIdType.GITHUB, faker.word.words(1), true)
    const personId3 = await accountClient.addSocialIdToPerson(personUuid, SocialIdType.GOOGLE, faker.word.words(1), true)
    const workspaces = await accountClient.listWorkspaces()
    if (workspaces.length === 0) {
      throw new Error('No workspaces found')
    }
    const workspaceUuid = workspaces[0].uuid

    // Test data setup
    const integration1: Integration = {
      socialId: personId1,
      kind: 'github',
      workspaceUuid: null, // Global integration
      data: {
        repo: 'repo1',
        owner: 'owner1',
        branch: 'main'
      }
    }

    const integration2: Integration = {
      socialId: personId2,
      kind: 'telegram-bot',
      workspaceUuid,
      data: {
        chatId: '123',
        username: 'bot1',
        webhookUrl: 'https://example.com/webhook'
      }
    }

    const integration3: Integration = {
      socialId: personId3,
      kind: 'mailbox',
      workspaceUuid,
      data: {
        email: 'test@example.com',
        name: 'Test Mailbox',
        settings: { folder: 'INBOX' }
      }
    }

    // Create and verify integrations one by one
    await accountClient.createIntegration(integration1)
    const checkIntegration1 = await accountClient.getIntegration({
      socialId: integration1.socialId,
      kind: integration1.kind,
      workspaceUuid: integration1.workspaceUuid
    })
    expect(checkIntegration1).toEqual(integration1)

    await accountClient.createIntegration(integration2)
    let checkIntegration2 = await accountClient.getIntegration({
      socialId: integration2.socialId,
      kind: integration2.kind,
      workspaceUuid: integration2.workspaceUuid
    })
    expect(checkIntegration2).toEqual(integration2)

    await accountClient.createIntegration(integration3)
    const checkIntegration3 = await accountClient.getIntegration({
      socialId: integration3.socialId,
      kind: integration3.kind,
      workspaceUuid: integration3.workspaceUuid
    })
    expect(checkIntegration3).toEqual(integration3)

    // Create secrets
    const secret1: IntegrationSecret = {
      socialId: personId1,
      kind: 'github',
      workspaceUuid: null,
      key: 'token',
      secret: 'github_pat_token_123'
    }

    const secret2: IntegrationSecret = {
      socialId: personId2,
      kind: 'telegram-bot',
      workspaceUuid,
      key: 'bot_token',
      secret: 'telegram_bot_token_123'
    }

    const secret3: IntegrationSecret = {
      socialId: personId2,
      kind: 'telegram-bot',
      workspaceUuid,
      key: 'api_key',
      secret: 'telegram_api_key_123'
    }

    // Add and verify secrets one by one
    await accountClient.addIntegrationSecret(secret1)
    const checkSecret1 = await accountClient.getIntegrationSecret({
      socialId: secret1.socialId,
      kind: secret1.kind,
      workspaceUuid: secret1.workspaceUuid,
      key: secret1.key
    })
    expect(checkSecret1).toEqual(secret1)

    await accountClient.addIntegrationSecret(secret2)
    let checkSecret2 = await accountClient.getIntegrationSecret({
      socialId: secret2.socialId,
      kind: secret2.kind,
      workspaceUuid: secret2.workspaceUuid,
      key: secret2.key
    })
    expect(checkSecret2).toEqual(secret2)

    await accountClient.addIntegrationSecret(secret3)
    const checkSecret3 = await accountClient.getIntegrationSecret({
      socialId: secret3.socialId,
      kind: secret3.kind,
      workspaceUuid: secret3.workspaceUuid,
      key: secret3.key
    })
    expect(checkSecret3).toEqual(secret3)

    // Test listing with various filters
    const allIntegrations = await accountClient.listIntegrations({})
    expect(allIntegrations).toHaveLength(3)
    expect(allIntegrations).toEqual(expect.arrayContaining([integration1, integration2, integration3]))

    const workspaceIntegrations = await accountClient.listIntegrations({ workspaceUuid })
    expect(workspaceIntegrations).toHaveLength(2)
    expect(workspaceIntegrations).toEqual(expect.arrayContaining([integration2, integration3]))

    const githubIntegrations = await accountClient.listIntegrations({ kind: 'github' })
    expect(githubIntegrations).toHaveLength(1)
    expect(githubIntegrations[0]).toEqual(integration1)

    const telegramIntegrations = await accountClient.listIntegrations({ kind: 'telegram-bot' })
    expect(telegramIntegrations).toHaveLength(1)
    expect(telegramIntegrations[0]).toEqual(integration2)

    // Test listing secrets with filters
    const allSecrets = await accountClient.listIntegrationsSecrets({})
    expect(allSecrets).toHaveLength(3)
    expect(allSecrets).toEqual(expect.arrayContaining([secret1, secret2, secret3]))

    const workspaceSecrets = await accountClient.listIntegrationsSecrets({
      workspaceUuid
    })
    expect(workspaceSecrets).toHaveLength(2)
    expect(workspaceSecrets).toEqual(expect.arrayContaining([secret2, secret3]))

    const telegramSecrets = await accountClient.listIntegrationsSecrets({ kind: 'telegram-bot' })
    expect(telegramSecrets).toHaveLength(2)
    expect(telegramSecrets).toEqual(expect.arrayContaining([secret2, secret3]))

    // Test updates
    const updatedIntegration2: Integration = {
      ...integration2,
      data: {
        chatId: '456',
        username: 'bot1_updated',
        webhookUrl: 'https://example.com/webhook2'
      }
    }
    await accountClient.updateIntegration(updatedIntegration2)
    checkIntegration2 = await accountClient.getIntegration({
      socialId: integration2.socialId,
      kind: integration2.kind,
      workspaceUuid: integration2.workspaceUuid
    })
    expect(checkIntegration2).toEqual(updatedIntegration2)

    const updatedSecret2: IntegrationSecret = {
      ...secret2,
      secret: 'telegram_bot_token_456'
    }
    await accountClient.updateIntegrationSecret(updatedSecret2)
    checkSecret2 = await accountClient.getIntegrationSecret({
      socialId: secret2.socialId,
      kind: secret2.kind,
      workspaceUuid: secret2.workspaceUuid,
      key: secret2.key
    })
    expect(checkSecret2).toEqual(updatedSecret2)

    // Test deletions
    await accountClient.deleteIntegration({
      socialId: integration1.socialId,
      kind: integration1.kind,
      workspaceUuid: integration1.workspaceUuid
    })

    await accountClient.deleteIntegrationSecret({
      socialId: secret2.socialId,
      kind: secret2.kind,
      workspaceUuid: secret2.workspaceUuid,
      key: secret2.key
    })

    // Verify deletions
    const remainingIntegrations = await accountClient.listIntegrations({})
    expect(remainingIntegrations).toHaveLength(2)
    expect(remainingIntegrations).toEqual(expect.arrayContaining([updatedIntegration2, integration3]))

    const remainingSecrets = await accountClient.listIntegrationsSecrets({})
    expect(remainingSecrets).toHaveLength(1)
    expect(remainingSecrets).toEqual(expect.arrayContaining([secret3]))

    // Verify deleted items don't exist
    const deletedIntegration = await accountClient.getIntegration({
      socialId: integration1.socialId,
      kind: integration1.kind,
      workspaceUuid: integration1.workspaceUuid
    })
    expect(deletedIntegration).toBeNull()

    const deletedSecret = await accountClient.getIntegrationSecret({
      socialId: secret2.socialId,
      kind: secret2.kind,
      workspaceUuid: secret2.workspaceUuid,
      key: secret2.key
    })
    expect(deletedSecret).toBeNull()
  })
})
