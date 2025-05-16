import { writeFileSync } from 'fs'
import builder from './'

const model = JSON.stringify(builder().getTxes())
writeFileSync(process.argv[2], model)
