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

  const mintInitialSupply = async (token, wallet) => { await token.mintSupplyFor(wallet, new BN('10000')) };

  beforeEach(async () => {
    fromToken = await FromToken.new();
    toToken = await ToToken.new();
    swapContract = await SwapContract.new(fromToken.address, toToken.address);

    // The SwapContract contract must own some toToken in order to proceed with the swap
    // We mint some for it by default for each tests
    await mintInitialSupply(toToken, swapContract.address);
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
      beforeEach(async () => await mintInitialSupply(fromToken, account));

      context("without giving approval to the contract", () => {
        it("reverts the transaction if no approval at not", async () => {
          await expectRevert(
            swapContract.provide(depositValue, {from: account}),
            'ERC20: transfer amount exceeds allowance -- Reason given: ERC20: transfer amount exceeds allowance.'
          );
        });

        it("reverts the transaction if not enough approval", async () => {
          const allowedValue = depositValue.subn(10);
          await fromToken.increaseAllowance(swapContract.address, allowedValue, {from: account});

          await expectRevert(
            swapContract.provide(depositValue, {from: account}),
            'ERC20: transfer amount exceeds allowance -- Reason given: ERC20: transfer amount exceeds allowance.'
          );
        });
      });

      context("with approval", () => {
        let initialContractBalance;
        let initialAccountBalance;

        beforeEach(async () => {
          await fromToken.increaseAllowance(swapContract.address, depositValue, {from: account})
          initialContractBalance = await fromToken.balanceOf(swapContract.address);
          initialAccountBalance = await fromToken.balanceOf(account);
        });

        it("deposits the amount of fromToken to the contract after approving allowance", async () => {
          await swapContract.provide(depositValue, {from: account});

          expect(await fromToken.balanceOf(account)).to.be.bignumber.equal(initialAccountBalance.sub(depositValue));
          expect(await fromToken.balanceOf(swapContract.address)).to.be.bignumber.equal(initialContractBalance.add(depositValue));
        });

        it("keeps the state contract up to date", async () => {
          await swapContract.provide(depositValue, {from: account});

          expect(await swapContract.balanceOfFromToken(account)).to.be.bignumber.equal(depositValue);
        });

        it("adds up multiple deposits", async () => {
          const [firstDeposit, secondDeposit] = [depositValue.divn(2), depositValue.divn(2)];
          await swapContract.provide(firstDeposit, {from: account});
          await swapContract.provide(secondDeposit, {from: account});
          const expectedAccountBalance = initialAccountBalance.sub(firstDeposit.add(secondDeposit));
          const expectedContractBalance = initialContractBalance.add(firstDeposit.add(secondDeposit));

          expect(await fromToken.balanceOf(account)).to.be.bignumber.equal(expectedAccountBalance);
          expect(await fromToken.balanceOf(swapContract.address)).to.be.bignumber.equal(expectedContractBalance);
        });
      });
    });
  });

  describe("swap()", () => {
    context("when the account hasn't made any deposit to the contract", () => {
      it("reverts the transaction", async () => {
        await expectRevert(
          swapContract.swap({from: account}),
          'SwapContract: empty balance make a deposit first'
        );
      });
    });

    context("when the account has made deposits", () => {
      const depositValue = new BN('100');
      const mintValue = new BN('1000');

      beforeEach(async () => {
        await fromToken.mintSupplyFor(account, mintValue);
        await fromToken.increaseAllowance(swapContract.address, mintValue, {from: account})
        await swapContract.provide(depositValue, {from: account});
      });

      it("swaps the two tokens", async () => {
        await swapContract.swap({from: account});
        const toTokenBalance = await swapContract.balanceOfToToken(account);

        expect(await swapContract.balanceOfFromToken(account)).to.be.bignumber.equal(new BN('0'));
        expect(toTokenBalance).to.be.bignumber.equal(depositValue);
      });

      it("adds up multiple swaps", async () => {
        await swapContract.swap({from: account});
        let anotherDeposit = new BN('200');
        await swapContract.provide(anotherDeposit, {from: account});
        await swapContract.swap({from: account});

        expect(await swapContract.balanceOfFromToken(account)).to.be.bignumber.equal(new BN('0'));
        expect(await swapContract.balanceOfToToken(account)).to.be.bignumber.equal(depositValue.add(anotherDeposit));
      });
    });
  });

  describe("withdraw()", () => {
    context("when the account hasn't performed any swap and has no token to withdraw", () => {
      it("reverts the transaction", async () => {
        await expectRevert(
          swapContract.withdraw({from: account}),
          'SwapContract: empty balance do a swap first'
        );
      });
    });

    context("when the account has performed a swap and has tokens to withdraw", () => {
      const mintedValue = new BN('1000');
      const swapedValue = new BN('100');

      beforeEach(async () => {
        await fromToken.mintSupplyFor(account, mintedValue);
        await fromToken.increaseAllowance(swapContract.address, mintedValue, {from: account})
        await swapContract.provide(swapedValue, {from: account});
        await swapContract.swap({from: account});
      });

      it("withdraws the entire balance into the account", async () => {
        const swapContractToTokenInitialBalance = await toToken.balanceOf(swapContract.address);
        await swapContract.withdraw({from: account});

        expect(await toToken.balanceOf(account)).to.be.bignumber.equal(swapedValue);
        expect(await toToken.balanceOf(swapContract.address)).to.be.bignumber.equal(swapContractToTokenInitialBalance.sub(swapedValue));
        expect(await swapContract.balanceOfToToken(account)).to.be.bignumber.equal(new BN('0'));
      });

      it("has no effect on provided tokens balance", async () => {
        const providedTokens = new BN('200');
        await swapContract.provide(providedTokens, {from: account});
        await swapContract.withdraw({from: account});

        expect(await swapContract.balanceOfFromToken(account)).to.be.bignumber.equal(providedTokens);
      });
    });
  });
});
