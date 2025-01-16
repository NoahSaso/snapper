import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

import { Command } from 'commander'

const program = new Command()
program.requiredOption(
  '-f, --file <file>',
  'File base name (without .pub.pem or .priv.pem)'
)
program.option('-o, --overwrite', 'Overwrite existing key pair if files exist')
program.parse()
const { file, overwrite } = program.opts()

const publicKeyFile = path.join(__dirname, '../..', file + '.pub.pem')
const privateKeyFile = path.join(__dirname, '../..', file + '.priv.pem')

if (fs.existsSync(publicKeyFile)) {
  if (overwrite) {
    console.log(`Overwriting public key in ${publicKeyFile}`)
  } else {
    console.log(
      `Public key already exists in ${publicKeyFile}. Pass --overwrite to overwrite.`
    )
    process.exit(0)
  }
}

if (fs.existsSync(privateKeyFile)) {
  if (overwrite) {
    console.log(`Overwriting private key in ${privateKeyFile}`)
  } else {
    console.log(
      `Private key already exists in ${privateKeyFile}. Pass --overwrite to overwrite.`
    )
    process.exit(0)
  }
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')

fs.writeFileSync(
  publicKeyFile,
  publicKey.export({
    type: 'spki',
    format: 'pem',
  })
)

console.log(`Wrote public key to ${publicKeyFile}`)

fs.writeFileSync(
  privateKeyFile,
  privateKey.export({
    type: 'pkcs8',
    format: 'pem',
  })
)

console.log(`Wrote private key to ${privateKeyFile}`)
