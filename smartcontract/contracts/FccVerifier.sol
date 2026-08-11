// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IVerifier.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title FccVerifier
 * @notice Local-mock ECDSA verifier used by the Coston2 hackathon prototype.
 * @dev This contract does not call the official FCC verifier. Production FCC proof
 * verification requires a separate adapter after the official ABI is pinned.
 */
contract FccVerifier is IVerifier {
    using ECDSA for bytes32;
    
    address public immutable reservedOfficialVerifier;

    constructor(address _reservedOfficialVerifier) {
        reservedOfficialVerifier = _reservedOfficialVerifier;
    }

    /**
     * @notice Recovers the signer of a local-mock match result.
     * @param digest The MatchResult digest.
     * @param signature The signature from the TEE.
     * @return signer The address recovered from the signature.
     */
    function verify(
        bytes32 digest,
        bytes calldata signature
    ) external pure returns (address signer) {
        // Local mock uses EIP-191 personal signing over the V2 settlement digest.
        return MessageHashUtils.toEthSignedMessageHash(digest).recover(signature);
    }
}
