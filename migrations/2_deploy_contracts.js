/* global artifacts */

const PaymentChannel = artifacts.require('./PaymentChannel.sol');

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    await deployer.deploy(PaymentChannel);
  });
};
