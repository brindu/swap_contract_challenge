pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SwapContract {
  IERC20 private fromToken;
  IERC20 private toToken;
  mapping(address => uint) private availableBalancesForSwap;

  constructor(IERC20 _fromToken, IERC20 _toToken) {
    fromToken = _fromToken;
    toToken = _toToken;
  }
}
