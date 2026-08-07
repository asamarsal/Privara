// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library PriceNormalization {
    function normalizeTo18Decimals(uint256 price, int8 decimals) internal pure returns (uint256) {
        if (decimals < 18) {
            return price * (10 ** uint256(int256(18 - decimals)));
        } else if (decimals > 18) {
            return price / (10 ** uint256(int256(decimals - 18)));
        }
        return price;
    }
}
