// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVerifier {
    function verify(bytes32 digest, bytes calldata signature) external view returns (address signer);
}
