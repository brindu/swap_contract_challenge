// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// For the purpose of the challenge we simply mint tokens for
// specified accounts (for tests reasons).
contract ERC20MintableForTest is ERC20 {
  constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {}

  function mintSupplyFor(address _account, uint256 _amount) external {
    _mint(_account, _amount);
  }
}
