// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SwapContract {
  IERC20 private fromToken;
  IERC20 private toToken;
  mapping(address => uint256) private availableBalancesForSwap;
  mapping(address => uint256) private availableBalancesForWithdraw;

  constructor(IERC20 _fromToken, IERC20 _toToken) {
    fromToken = _fromToken;
    toToken = _toToken;
  }

  function provide(uint256 _amount) public {
    address from = msg.sender;
    fromToken.transferFrom(from, address(this), _amount);
    availableBalancesForSwap[from] += _amount;
  }

  function swap() public {
    require(
      balanceOfFromToken(msg.sender) > 0,
      'SwapContract: empty balance make a deposit first'
    );
    availableBalancesForWithdraw[msg.sender] += availableBalancesForSwap[msg.sender];
    availableBalancesForSwap[msg.sender] = 0;
  }

  // Internal state getters, particularly usefull for tests
  function balanceOfFromToken(address _account) public view returns(uint256) {
    return availableBalancesForSwap[_account];
  }

  function balanceOfToToken(address _account) public view returns(uint256) {
    return availableBalancesForWithdraw[_account];
  }
}
