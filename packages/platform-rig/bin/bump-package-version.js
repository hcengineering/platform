//
// Copyright © 2022 Hardcore Engineering Inc.
//

const child_process = require('child_process')

child_process.exec('git describe --tags --abbrev=0', (err, stdout, stderr) => {
  if (err !== null) {
    if (err.message.includes('No names found')) {
      console.log('No git version available')
      return
    }
    console.log('Error', err)
    process.exit(1)
  }
  const rawVersion = stdout.trim().replace('v', '').replace('u', '').split('.')
  if (rawVersion.length === 3) {
    const version = {
      major: parseInt(rawVersion[0]),
      minor: parseInt(rawVersion[1]),
      patch: parseInt(rawVersion[2])
    }
    const versionStr = `${version.major}.${version.minor}.${version.patch}`
    console.log(`Setting version to ${versionStr}`)
    child_process.exec(`npm version ${versionStr}`)
  }
})
