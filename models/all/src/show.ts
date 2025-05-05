import builder from './'

const model = JSON.stringify(builder().getTxes())
console.log(model)
