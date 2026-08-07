// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IFtsoV2.sol";

contract MockFtsoV2 is IFtsoV2 {
    uint256 private _price;
    int8 private _decimals;
    uint64 private _timestamp;

    function setPrice(uint256 price, int8 decimals, uint64 timestamp) external {
        _price = price;
        _decimals = decimals;
        _timestamp = timestamp;
    }

    function getFeedById(
        bytes21 /* _feedId */
    ) external payable returns (uint256 value, int8 decimals, uint64 timestamp) {
        return (_price, _decimals, _timestamp);
    }
}

