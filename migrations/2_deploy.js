const TokenA = artifacts.require('TokenA');
const TokenB = artifacts.require('TokenB');
const SwapContract = artifacts.require('SwapContract');

module.exports = async function(deployer) {
  await deployer.deploy(TokenA);
  const tokenA = await TokenA.deployed();

  await deployer.deploy(TokenB);
  const tokenB = await TokenB.deployed();

  await deployer.deploy(SwapContract, tokenA.address, tokenB.address);
};
