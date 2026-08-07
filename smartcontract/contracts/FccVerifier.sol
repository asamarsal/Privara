// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IVerifier.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title FccVerifier
 * @notice Adapter for the official Flare Confidential Compute verifier.
 * @dev In the local mock mode, this does ECDSA recovery matching the Node mock behavior.
 */
contract FccVerifier is IVerifier {
    using ECDSA for bytes32;
    
    address public immutable officialVerifier;

    constructor(address _officialVerifier) {
        officialVerifier = _officialVerifier;
    }

    /**
     * @notice Verifies a match result signed by the TEE.
     * @param digest The MatchResult digest.
     * @param signature The signature from the TEE.
     * @return signer The address recovered from the signature.
     */
    function verify(
        bytes32 digest,
        bytes calldata signature
    ) external pure returns (address signer) {
        // In local mock mode, the TEE node uses standard ECDSA over the digest
        // Note: The actual Flare FCC verifier on-chain might have a different ABI and we would call it here.
        // For local development, this faithfully replicates TestVerifier behavior while fulfilling the FccVerifier adapter shape.
        return MessageHashUtils.toEthSignedMessageHash(digest).recover(signature);
    }
}
