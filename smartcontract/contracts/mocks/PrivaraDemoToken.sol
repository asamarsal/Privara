// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Coston2-only demo asset. It is not a production-backed FAsset.
contract PrivaraDemoToken is ERC20, Ownable {
    uint256 public immutable faucetAmount;
    uint256 public immutable maxSupply;
    mapping(address => bool) public hasClaimed;

    error AlreadyClaimed();
    error MaxSupplyExceeded();
    error ZeroAddress();

    constructor(
        string memory name_,
        string memory symbol_,
        address owner_,
        uint256 faucetAmount_,
        uint256 maxSupply_
    ) ERC20(name_, symbol_) Ownable(owner_) {
        if (owner_ == address(0)) revert ZeroAddress();
        faucetAmount = faucetAmount_;
        maxSupply = maxSupply_;
    }

    /// @notice One-time claim for testnet demo users.
    function claim() external {
        if (hasClaimed[msg.sender]) revert AlreadyClaimed();
        hasClaimed[msg.sender] = true;
        _mintWithinCap(msg.sender, faucetAmount);
    }

    /// @notice Owner mint for explicitly funded demo wallets and recovery.
    function mint(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        _mintWithinCap(to, amount);
    }

    function _mintWithinCap(address to, uint256 amount) internal {
        if (totalSupply() + amount > maxSupply) revert MaxSupplyExceeded();
        _mint(to, amount);
    }
}
