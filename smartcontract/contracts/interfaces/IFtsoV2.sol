// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Official Coston2 FTSOv2 address: 0x7BDE3Df0624114eDB3A67dFe6753e62f4e7c1d20
// XRP/USD Feed ID: 0x015852502f55534400000000000000000000000000
interface IFtsoV2 {
    function getFeedById(
        bytes21 _feedId
    ) external payable returns (uint256 _value, int8 _decimals, uint64 _timestamp);
}
