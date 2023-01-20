import core, { getWorkspaceId, TxOperations } from '@hcengineering/core'
import openai, { openAIConfigDefaults } from '@hcengineering/openai'
import { connect } from '@hcengineering/server-tool'

export async function openAIConfig (
  transactorUrl: string,
  workspace: string,
  productId: string,
  opt: { endpoint: string, token: string, enabled: boolean, tokenLimit: number, embeddings: boolean }
): Promise<void> {
  const connection = await connect(transactorUrl, getWorkspaceId(workspace, productId), '#configurator@hc.engineering')
  try {
    const ops = new TxOperations(connection, core.account.System)

    // Check if EmployeeAccoun is not exists
    const config = await ops.findOne(openai.class.OpenAIConfiguration, {})

    if (config === undefined) {
      await ops.createDoc(openai.class.OpenAIConfiguration, core.space.Configuration, {
        ...openAIConfigDefaults,
        ...opt
      })
    } else {
      await ops.update(config, {
        ...openAIConfigDefaults,
        ...opt
      })
    }
  } catch (err: any) {
    console.trace(err)
  } finally {
    await connection.close()
  }
}
