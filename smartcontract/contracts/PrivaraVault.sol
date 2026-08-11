// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IFtsoV2.sol";
import "./interfaces/IVerifier.sol";
import "./libraries/PriceNormalization.sol";

/// @notice Coston2 hackathon vault for exact-fill FXRP/USDT0 limit orders.
/// @dev Both assets must use 18 decimals. A new deployment is required for this version.
contract PrivaraVault is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    enum OrderSide { buy, sell }

    struct OrderRecord {
        address maker;
        OrderSide side;
        address tokenIn;
        uint256 amountIn;
        bytes32 encryptedCommitment;
        uint64 expiry;
        bool exists;
    }

    struct SettleParams {
        bytes32 matchId;
        bytes32 buyOrderId;
        bytes32 sellOrderId;
        uint256 executionPrice;
        uint256 fxrpAmount;
        uint256 quoteAmount;
        uint64 matchExpiry;
        bytes signature;
    }

    mapping(address => mapping(address => uint256)) internal _balances;
    mapping(address => mapping(address => uint256)) internal _locked;
    mapping(bytes32 => OrderRecord) internal _orders;
    mapping(bytes32 => bool) internal _cancelled;
    mapping(bytes32 => bool) internal _filled;
    mapping(bytes32 => bool) internal _settled;

    address public immutable FXRP;
    address public immutable USDT0;
    IFtsoV2 public immutable ftsoV2;
    IVerifier public immutable verifier;
    address public immutable authorizedVerifier;
    bytes21 public immutable xrpUsdFeedId;

    uint256 public constant PRICE_SCALE = 1e18;
    uint256 public constant MAX_DEVIATION_BPS = 200;
    uint256 public constant MAX_ORACLE_AGE = 300;

    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);
    event OrderCommitted(bytes32 indexed orderId, address indexed maker, OrderSide side, address tokenIn, uint256 amountIn, bytes32 encryptedCommitment, uint64 expiry);
    event OrderCancelled(bytes32 indexed orderId, address indexed maker);
    event OrderSettled(bytes32 indexed matchId, bytes32 indexed buyOrderId, bytes32 indexed sellOrderId, uint256 executionPrice, uint256 fxrpAmount, uint256 quoteAmount);

    error UnsupportedToken();
    error UnsupportedDecimals();
    error InvalidTokenForSide();
    error ZeroAmount();
    error ZeroAddress();
    error ZeroCommitment();
    error OrderExists();
    error OrderNotFound();
    error OrderExpired();
    error OrderAlreadyCancelled();
    error OrderAlreadyFilled();
    error NotOrderMaker();
    error InsufficientBalance();
    error InsufficientAvailableBalance();
    error ReplayDetected(bytes32 matchId);
    error MatchExpired(bytes32 matchId);
    error MatchOutlivesOrder();
    error WrongOrderSide();
    error InvalidProof();
    error InvalidSettlementAmount();
    error InvalidQuoteAmount(uint256 expected, uint256 actual);
    error OraclePriceInvalid();
    error OraclePriceStale(uint256 age, uint256 maxAge);
    error OracleTimestampInFuture();
    error OracleDeviationExceeded(uint256 actual, uint256 max);

    constructor(
        address fxrp,
        address usdt0,
        IFtsoV2 _ftsoV2,
        IVerifier _verifier,
        address _authorizedVerifier,
        bytes21 _xrpUsdFeedId
    ) Ownable(msg.sender) {
        if (fxrp == address(0) || usdt0 == address(0) || address(_ftsoV2) == address(0) || address(_verifier) == address(0) || _authorizedVerifier == address(0)) revert ZeroAddress();
        if (fxrp == usdt0) revert UnsupportedToken();
        if (IERC20Metadata(fxrp).decimals() != 18 || IERC20Metadata(usdt0).decimals() != 18) revert UnsupportedDecimals();
        FXRP = fxrp;
        USDT0 = usdt0;
        ftsoV2 = _ftsoV2;
        verifier = _verifier;
        authorizedVerifier = _authorizedVerifier;
        xrpUsdFeedId = _xrpUsdFeedId;
    }

    function deposit(address token, uint256 amount) external nonReentrant {
        _requireSupportedToken(token);
        if (amount == 0) revert ZeroAmount();

        uint256 beforeBalance = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = IERC20(token).balanceOf(address(this)) - beforeBalance;
        if (received != amount) revert InvalidSettlementAmount();

        _balances[token][msg.sender] += amount;
        emit Deposited(msg.sender, token, amount);
    }

    function withdraw(address token, uint256 amount) external nonReentrant {
        _requireSupportedToken(token);
        if (amount == 0) revert ZeroAmount();
        if (availableBalanceOf(token, msg.sender) < amount) revert InsufficientAvailableBalance();

        _balances[token][msg.sender] -= amount;
        IERC20(token).safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, token, amount);
    }

    function commitOrder(
        bytes32 orderId,
        OrderSide side,
        address tokenIn,
        uint256 amountIn,
        bytes32 encryptedCommitment,
        uint64 expiry
    ) external nonReentrant {
        if (_orders[orderId].exists) revert OrderExists();
        if (expiry <= block.timestamp) revert OrderExpired();
        if (amountIn == 0) revert ZeroAmount();
        if (encryptedCommitment == bytes32(0)) revert ZeroCommitment();
        _requireSupportedToken(tokenIn);
        if ((side == OrderSide.buy && tokenIn != USDT0) || (side == OrderSide.sell && tokenIn != FXRP)) revert InvalidTokenForSide();
        if (availableBalanceOf(tokenIn, msg.sender) < amountIn) revert InsufficientAvailableBalance();

        _locked[tokenIn][msg.sender] += amountIn;
        _orders[orderId] = OrderRecord(msg.sender, side, tokenIn, amountIn, encryptedCommitment, expiry, true);
        emit OrderCommitted(orderId, msg.sender, side, tokenIn, amountIn, encryptedCommitment, expiry);
    }

    function cancelOrder(bytes32 orderId) external nonReentrant {
        OrderRecord storage order = _orders[orderId];
        if (!order.exists) revert OrderNotFound();
        if (msg.sender != order.maker) revert NotOrderMaker();
        if (_cancelled[orderId]) revert OrderAlreadyCancelled();
        if (_filled[orderId]) revert OrderAlreadyFilled();

        _cancelled[orderId] = true;
        _locked[order.tokenIn][order.maker] -= order.amountIn;
        emit OrderCancelled(orderId, msg.sender);
    }

    function settle(SettleParams calldata params) external nonReentrant {
        if (_settled[params.matchId]) revert ReplayDetected(params.matchId);
        if (block.timestamp > params.matchExpiry) revert MatchExpired(params.matchId);

        OrderRecord memory buyOrder = _activeOrder(params.buyOrderId);
        OrderRecord memory sellOrder = _activeOrder(params.sellOrderId);
        if (buyOrder.side != OrderSide.buy || sellOrder.side != OrderSide.sell) revert WrongOrderSide();
        if (buyOrder.tokenIn != USDT0 || sellOrder.tokenIn != FXRP) revert InvalidTokenForSide();
        if (params.matchExpiry > buyOrder.expiry || params.matchExpiry > sellOrder.expiry) revert MatchOutlivesOrder();

        // MVP fills the complete sell base amount. The buy amount is a maximum quote budget;
        // midpoint execution may spend less and the unused lock is released.
        if (params.fxrpAmount != sellOrder.amountIn || params.quoteAmount > buyOrder.amountIn) revert InvalidSettlementAmount();
        uint256 expectedQuote = (params.fxrpAmount * params.executionPrice) / PRICE_SCALE;
        if (expectedQuote != params.quoteAmount) revert InvalidQuoteAmount(expectedQuote, params.quoteAmount);

        bytes32 digest = hashMatchResult(
            params.matchId,
            params.buyOrderId,
            params.sellOrderId,
            buyOrder.encryptedCommitment,
            sellOrder.encryptedCommitment,
            params.executionPrice,
            params.fxrpAmount,
            params.quoteAmount,
            params.matchExpiry,
            block.chainid,
            address(this)
        );
        if (verifier.verify(digest, params.signature) != authorizedVerifier) revert InvalidProof();

        (uint256 oraclePrice, int8 decimals, uint64 timestamp) = ftsoV2.getFeedById(xrpUsdFeedId);
        if (oraclePrice == 0 || timestamp == 0) revert OraclePriceInvalid();
        if (timestamp > block.timestamp) revert OracleTimestampInFuture();
        uint256 oracleAge = block.timestamp - timestamp;
        if (oracleAge > MAX_ORACLE_AGE) revert OraclePriceStale(oracleAge, MAX_ORACLE_AGE);
        uint256 oraclePrice18 = PriceNormalization.normalizeTo18Decimals(oraclePrice, decimals);
        if (oraclePrice18 == 0) revert OraclePriceInvalid();
        _checkOracleDeviation(oraclePrice18, params.executionPrice);

        _locked[FXRP][sellOrder.maker] -= sellOrder.amountIn;
        _locked[USDT0][buyOrder.maker] -= buyOrder.amountIn;
        _balances[FXRP][sellOrder.maker] -= params.fxrpAmount;
        _balances[FXRP][buyOrder.maker] += params.fxrpAmount;
        _balances[USDT0][buyOrder.maker] -= params.quoteAmount;
        _balances[USDT0][sellOrder.maker] += params.quoteAmount;

        _filled[params.buyOrderId] = true;
        _filled[params.sellOrderId] = true;
        _settled[params.matchId] = true;
        emit OrderSettled(params.matchId, params.buyOrderId, params.sellOrderId, params.executionPrice, params.fxrpAmount, params.quoteAmount);
    }

    function balanceOf(address token, address user) external view returns (uint256) { return _balances[token][user]; }
    function lockedBalanceOf(address token, address user) external view returns (uint256) { return _locked[token][user]; }
    function availableBalanceOf(address token, address user) public view returns (uint256) { return _balances[token][user] - _locked[token][user]; }
    function isMatchSettled(bytes32 matchId) external view returns (bool) { return _settled[matchId]; }
    function isOrderCancelled(bytes32 orderId) external view returns (bool) { return _cancelled[orderId]; }
    function isOrderFilled(bytes32 orderId) external view returns (bool) { return _filled[orderId]; }
    function getOrder(bytes32 orderId) external view returns (OrderRecord memory) { return _orders[orderId]; }

    function hashMatchResult(
        bytes32 matchId,
        bytes32 buyOrderId,
        bytes32 sellOrderId,
        bytes32 buyCommitment,
        bytes32 sellCommitment,
        uint256 executionPrice,
        uint256 fxrpAmount,
        uint256 quoteAmount,
        uint64 expiry,
        uint256 chainId,
        address vaultAddress
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(
            keccak256("PRIVARA_MATCH_RESULT_V2"),
            matchId,
            buyOrderId,
            sellOrderId,
            buyCommitment,
            sellCommitment,
            executionPrice,
            fxrpAmount,
            quoteAmount,
            expiry,
            chainId,
            vaultAddress
        ));
    }

    function _activeOrder(bytes32 orderId) internal view returns (OrderRecord memory order) {
        order = _orders[orderId];
        if (!order.exists) revert OrderNotFound();
        if (_cancelled[orderId]) revert OrderAlreadyCancelled();
        if (_filled[orderId]) revert OrderAlreadyFilled();
        if (order.expiry <= block.timestamp) revert OrderExpired();
    }

    function _requireSupportedToken(address token) internal view {
        if (token != FXRP && token != USDT0) revert UnsupportedToken();
    }

    function _checkOracleDeviation(uint256 oraclePrice18, uint256 executionPrice18) internal pure {
        uint256 delta = oraclePrice18 > executionPrice18 ? oraclePrice18 - executionPrice18 : executionPrice18 - oraclePrice18;
        uint256 deviationBps = (delta * 10_000) / oraclePrice18;
        if (deviationBps > MAX_DEVIATION_BPS) revert OracleDeviationExceeded(deviationBps, MAX_DEVIATION_BPS);
    }
}
