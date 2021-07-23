// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./ERC20MintableForTest.sol";

contract TokenB is ERC20MintableForTest {
  constructor() ERC20MintableForTest("TokenB", "TKB") {}
}
