const { expect } = require('chai');
const { BN, expectRevert } = require('@openzeppelin/test-helpers');

const FromToken = artifacts.require('TokenA');
const ToToken = artifacts.require('TokenB');
const SwapContract = artifacts.require('SwapContract');

contract("SwapContract", accounts => {
  let account = accounts[0];
  let fromToken;
  let toToken;
  let swapContract;

  beforeEach(async () => {
    fromToken = await FromToken.new();
    toToken = await ToToken.new();
    swapContract = await SwapContract.new(fromToken.address, toToken.address);

    // The SwapContract contract must own some toToken in order to proceed with the swap
    // We mint some for it by default for each tests
    await toToken.mintSupplyFor(swapContract.address, new BN('1000'));
  });

  describe("provide()", () => {
    const depositValue = new BN('100');

    context("when the account doesn't have a sufficient balance of fromToken", () => {
      it("fails to deposit in the contract", async () => {
        await expectRevert(
          swapContract.provide(depositValue, {from: account}),
          'ERC20: transfer amount exceeds balance -- Reason given: ERC20: transfer amount exceeds balance.'
        );
      });
    });

    context("when the account has a sufficient balance of fromToken", () => {
      const fromTokenBalance = new BN('1000');

      beforeEach(async () => await fromToken.mintSupplyFor(account, fromTokenBalance));

      context("without approval", () => {
        it("fails if the account hasn't approved allowance to the SwapContract first", async () => {
          await expectRevert(
            swapContract.provide(depositValue, {from: account}),
            'ERC20: transfer amount exceeds allowance -- Reason given: ERC20: transfer amount exceeds allowance.'
          );
        });

        it("fails if the account hasn't approved allowance for the total amount of fromToken to deposit", async () => {
          const allowedValue = depositValue.subn(10);
          await fromToken.increaseAllowance(swapContract.address, allowedValue, {from: account});

          await expectRevert(
            swapContract.provide(depositValue, {from: account}),
            'ERC20: transfer amount exceeds allowance -- Reason given: ERC20: transfer amount exceeds allowance.'
          );
        });
      });

      context("with approval", () => {
        let swapContractFromTokenInitialBalance;

        beforeEach(async () => {
          await fromToken.increaseAllowance(swapContract.address, depositValue, {from: account})
          swapContractFromTokenInitialBalance = await fromToken.balanceOf(swapContract.address);
        });

        it("deposits the amount of fromToken to the contract after approving allowance", async () => {
          await swapContract.provide(depositValue, {from: account});

          expect((await fromToken.balanceOf(account))).to.be.bignumber.equal((fromTokenBalance.sub(depositValue)));
          expect((await fromToken.balanceOf(swapContract.address))).to.be.bignumber.equal((swapContractFromTokenInitialBalance.add(depositValue)));
        });

        it("adds up multiple deposits", async () => {
          const [firstDeposit, secondDeposit] = [depositValue.divn(2), depositValue.divn(2)];
          await swapContract.provide(firstDeposit, {from: account});
          await swapContract.provide(secondDeposit, {from: account});
          const remainingAccountBalance = fromTokenBalance.sub(firstDeposit.add(secondDeposit));
          const contractBalance = firstDeposit.add(secondDeposit);

          expect((await fromToken.balanceOf(account))).to.be.bignumber.equal(remainingAccountBalance);
          expect((await fromToken.balanceOf(swapContract.address))).to.be.bignumber.equal(contractBalance);
        });
      });
    });
  });
});
