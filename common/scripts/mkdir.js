const fs = require('fs')
const args = process.argv

const directory = args[2]

if (!fs.existsSync(directory)) {
  fs.mkdirSync(directory)
}