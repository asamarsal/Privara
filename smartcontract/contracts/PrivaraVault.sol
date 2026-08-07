// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IFtsoV2.sol";
import "./interfaces/IVerifier.sol";
import "./libraries/PriceNormalization.sol";

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

    uint256 public constant MAX_DEVIATION_BPS = 200;

    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);
    event OrderCommitted(bytes32 indexed orderId, address indexed maker, OrderSide side, address tokenIn, uint256 amountIn, uint64 expiry);
    event OrderCancelled(bytes32 indexed orderId, address indexed maker);
    event OrderSettled(bytes32 indexed matchId, bytes32 indexed buyOrderId, bytes32 indexed sellOrderId, uint256 executionPrice, uint256 fxrpAmount, uint256 quoteAmount);

    error UnsupportedToken();
    error ZeroAmount();
    error ZeroAddress();
    error OrderExists();
    error OrderNotFound();
    error OrderExpired();
    error OrderAlreadyCancelled();
    error OrderAlreadyFilled();
    error NotOrderMaker();
    error InsufficientBalance();
    
    error ReplayDetected(bytes32 matchId);
    error MatchExpired(bytes32 matchId);
    error WrongOrderSide();
    error InvalidProof();
    error OracleDeviationExceeded(uint256 actual, uint256 max);

    constructor(
        address fxrp, 
        address usdt0,
        IFtsoV2 _ftsoV2,
        IVerifier _verifier,
        address _authorizedVerifier,
        bytes21 _xrpUsdFeedId
    ) Ownable(msg.sender) {
        if (fxrp == address(0) || usdt0 == address(0) || address(_ftsoV2) == address(0) || address(_verifier) == address(0) || _authorizedVerifier == address(0)) {
            revert ZeroAddress();
        }
        FXRP = fxrp;
        USDT0 = usdt0;
        ftsoV2 = _ftsoV2;
        verifier = _verifier;
        authorizedVerifier = _authorizedVerifier;
        xrpUsdFeedId = _xrpUsdFeedId;
    }

    function deposit(address token, uint256 amount) external nonReentrant {
        if (token != FXRP && token != USDT0) {
            revert UnsupportedToken();
        }
        if (amount == 0) {
            revert ZeroAmount();
        }

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        _balances[token][msg.sender] += amount;

        emit Deposited(msg.sender, token, amount);
    }

    function withdraw(address token, uint256 amount) external nonReentrant {
        if (amount == 0) {
            revert ZeroAmount();
        }
        if (_balances[token][msg.sender] < amount) {
            revert InsufficientBalance();
        }

        // Checks-effects-interactions
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
        if (_orders[orderId].exists) {
            revert OrderExists();
        }
        if (expiry <= block.timestamp) {
            revert OrderExpired();
        }
        if (amountIn == 0) {
            revert ZeroAmount();
        }
        if (tokenIn != FXRP && tokenIn != USDT0) {
            revert UnsupportedToken();
        }
        if (_balances[tokenIn][msg.sender] < amountIn) {
            revert InsufficientBalance();
        }

        _orders[orderId] = OrderRecord({
            maker: msg.sender,
            side: side,
            tokenIn: tokenIn,
            amountIn: amountIn,
            encryptedCommitment: encryptedCommitment,
            expiry: expiry,
            exists: true
        });

        emit OrderCommitted(orderId, msg.sender, side, tokenIn, amountIn, expiry);
    }

    function cancelOrder(bytes32 orderId) external nonReentrant {
        if (!_orders[orderId].exists) {
            revert OrderNotFound();
        }
        if (msg.sender != _orders[orderId].maker) {
            revert NotOrderMaker();
        }
        if (_cancelled[orderId]) {
            revert OrderAlreadyCancelled();
        }
        if (_filled[orderId]) {
            revert OrderAlreadyFilled();
        }

        _cancelled[orderId] = true;

        emit OrderCancelled(orderId, msg.sender);
    }
    
    function settle(SettleParams calldata params) external nonReentrant {
        if (_settled[params.matchId]) revert ReplayDetected(params.matchId);
        if (block.timestamp > params.matchExpiry) revert MatchExpired(params.matchId);

        OrderRecord memory buyOrder = _orders[params.buyOrderId];
        OrderRecord memory sellOrder = _orders[params.sellOrderId];

        if (!buyOrder.exists) revert OrderNotFound();
        if (!sellOrder.exists) revert OrderNotFound();

        if (_cancelled[params.buyOrderId]) revert OrderAlreadyCancelled();
        if (_cancelled[params.sellOrderId]) revert OrderAlreadyCancelled();

        if (_filled[params.buyOrderId]) revert OrderAlreadyFilled();
        if (_filled[params.sellOrderId]) revert OrderAlreadyFilled();

        if (buyOrder.expiry <= block.timestamp) revert OrderExpired();
        if (sellOrder.expiry <= block.timestamp) revert OrderExpired();

        if (buyOrder.side != OrderSide.buy) revert WrongOrderSide();
        if (sellOrder.side != OrderSide.sell) revert WrongOrderSide();

        if (_balances[FXRP][sellOrder.maker] < params.fxrpAmount) revert InsufficientBalance();
        if (_balances[USDT0][buyOrder.maker] < params.quoteAmount) revert InsufficientBalance();

        bytes32 digest = hashMatchResult(
            params.matchId,
            params.buyOrderId,
            params.sellOrderId,
            params.executionPrice,
            params.fxrpAmount,
            params.quoteAmount,
            params.matchExpiry,
            block.chainid,
            address(this)
        );

        address signer = verifier.verify(digest, params.signature);
        if (signer != authorizedVerifier) revert InvalidProof();

        (uint256 oraclePrice, int8 decimals, ) = ftsoV2.getFeedById(xrpUsdFeedId);
        uint256 oraclePrice18 = PriceNormalization.normalizeTo18Decimals(oraclePrice, decimals);
        checkOracleDeviation(oraclePrice18, params.executionPrice, MAX_DEVIATION_BPS);

        _balances[FXRP][sellOrder.maker] -= params.fxrpAmount;
        _balances[FXRP][buyOrder.maker] += params.fxrpAmount;
        
        _balances[USDT0][buyOrder.maker] -= params.quoteAmount;
        _balances[USDT0][sellOrder.maker] += params.quoteAmount;

        _filled[params.buyOrderId] = true;
        _filled[params.sellOrderId] = true;
        _settled[params.matchId] = true;

        emit OrderSettled(params.matchId, params.buyOrderId, params.sellOrderId, params.executionPrice, params.fxrpAmount, params.quoteAmount);
    }

    function balanceOf(address token, address user) external view returns (uint256) {
        return _balances[token][user];
    }
    
    function checkOracleDeviation(uint256 oraclePrice18, uint256 executionPrice18, uint256 maxDeviationBps) internal pure {
        uint256 delta = oraclePrice18 > executionPrice18 ? oraclePrice18 - executionPrice18 : executionPrice18 - oraclePrice18;
        uint256 deviationBps = (delta * 10_000) / oraclePrice18;
        if (deviationBps > maxDeviationBps) {
            revert OracleDeviationExceeded(deviationBps, maxDeviationBps);
        }
    }
    
    function hashMatchResult(
        bytes32 matchId,
        bytes32 buyOrderId,
        bytes32 sellOrderId,
        uint256 executionPrice,
        uint256 fxrpAmount,
        uint256 quoteAmount,
        uint64 expiry,
        uint256 chainId,
        address vaultAddress
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            matchId,
            buyOrderId,
            sellOrderId,
            executionPrice,
            fxrpAmount,
            quoteAmount,
            expiry,
            chainId,
            vaultAddress
        ));
    }
}
