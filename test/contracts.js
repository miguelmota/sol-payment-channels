const PaymentChannel = artifacts.require('PaymentChannel')
const BN = require('bn.js')
const moment = require('moment')
const {soliditySha3: sha3} = require('web3-utils')
const util = require('ethereumjs-util')
const Reverter = require('./utils/reverter')

const big = (n) => new BN(n.toString(10))
const tenPow18 = big(10).pow(big(18))
const oneEth = big(1).mul(tenPow18).toString(10)

contract('Contracts', (accounts) => {
  const reverter = new Reverter(web3)
  const owner = accounts[0]
  const alice = accounts[1] // merchant
  const bob = accounts[2] // customer
  let channel

  before('setup', async () => {
    channel = await PaymentChannel.new()

    await reverter.snapshot()
  })

  context('PaymentChannel', () => {
    describe('open and close', () => {
      it('alice should open a payment channel', async () => {
        const timeout = moment().add(1, 'day').unix()
        const result = await channel.open(timeout, bob, {
          from: bob,
          to: channel.address,
          value: oneEth
        })

        assert.equal(result.receipt.status, '0x01')

        const bal = await web3.eth.getBalance(channel.address)
        assert.equal(bal.toString(), oneEth.toString())
      })
      it('alice should close payment channel', async () => {
        const total = oneEth
        let hash = sha3(
          {type: 'address', value: channel.address},
          {type: 'uint256', value: total.toString()}
        )

        const sig = (await web3.eth.sign(bob, hash)).slice(2)
        const r = '0x' + sig.slice(0, 64)
        const s = '0x' + sig.slice(64, 128)
        const v = web3.toDecimal(sig.slice(128, 130)) + 27

        hash = Buffer.from(hash.slice(2), 'hex')
        const prefix = new Buffer('\x19Ethereum Signed Message:\n')
        const msg = '0x' + util.keccak256(
          Buffer.concat([prefix, new Buffer(String(hash.length)), hash])
        ).toString('hex')

        const result = await channel.close(msg, r, s, v, bob, total.toString(), {
          from: alice,
        })

        assert.equal(result.receipt.status, '0x01')
      })
      it('alice should fail at closing payment channel again', async () => {
        const total = oneEth
        let hash = sha3(
          {type: 'address', value: channel.address},
          {type: 'uint256', value: total.toString()}
        )

        const sig = (await web3.eth.sign(bob, hash)).slice(2)
        const r = '0x' + sig.slice(0, 64)
        const s = '0x' + sig.slice(64, 128)
        const v = web3.toDecimal(sig.slice(128, 130)) + 27

        hash = Buffer.from(hash.slice(2), 'hex')
        const prefix = new Buffer('\x19Ethereum Signed Message:\n')
        const msg = '0x' + util.keccak256(
          Buffer.concat([prefix, new Buffer(String(hash.length)), hash])
        ).toString('hex')

        try {
          await channel.close(msg, r, s, v, bob, total.toString(), {
            from: alice,
          })
          assert.fail()
        } catch (err) {
          assert.ok(err)
        }
      })
      after(async () => {
        await reverter.revert()
      })
    })
  })
})
