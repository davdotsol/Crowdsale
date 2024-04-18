// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

import "hardhat/console.sol";
import "./Token.sol";

// Crowdsale contract for managing the sale of ERC-20 tokens with whitelisting, open/close functionality, and contribution limits
contract Crowdsale {
    address public owner;
    Token public token;
    uint256 public price;
    uint256 public maxTokens;
    uint256 public tokensSold;
    uint256 public startTime; // Timestamp for when the crowdsale should start
    uint256 public minContribution; // Minimum number of tokens that must be purchased
    uint256 public maxContribution; // Maximum number of tokens that can be purchased in a single transaction
    mapping(address => bool) public whitelisted;

    // Events for logging buys, finalization actions, whitelisting, and status changes
    event Buy(uint256 amount, address buyer);
    event Finalize(uint256 tokensSold, uint256 ethRaised);
    event Whitelisted(address user);
    event CrowdsaleOpened(uint256 time);

    // Constructor to set up the Crowdsale with initial sale parameters
    constructor(
        Token _token,
        uint256 _price,
        uint256 _maxTokens,
        uint256 _startTime,
        uint256 _minContribution,
        uint256 _maxContribution
    ) {
        owner = msg.sender;
        token = _token;
        price = _price;
        maxTokens = _maxTokens;
        startTime = _startTime;
        minContribution = _minContribution;
        maxContribution = _maxContribution;
    }

    // Modifier to restrict calls to only the owner of the contract
    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    // Modifier to check if the caller is whitelisted
    modifier onlyWhitelisted() {
        require(whitelisted[msg.sender], "Caller is not whitelisted");
        _;
    }

    // Modifier to check if the crowdsale is open
    modifier whenOpen() {
        require(block.timestamp >= startTime, "Crowdsale is not open yet");
        _;
    }

    // Fallback function to handle ETH sent directly to the contract
    receive() external payable onlyWhitelisted whenOpen {
        uint256 amount = (msg.value / price) * 1e18; // Convert ETH to token amount
        buyTokens(amount);
    }

    // Public function to buy tokens, restricted to whitelisted addresses and only when open
    function buyTokens(
        uint256 _amount
    ) public payable onlyWhitelisted whenOpen {
        require(
            _amount >= minContribution && _amount <= maxContribution,
            "Amount of tokens bought is outside allowed contribution limits"
        );
        require(
            msg.value == (_amount / 1e18) * price,
            "Ether value sent is not correct"
        );
        require(
            token.balanceOf(address(this)) >= _amount,
            "Not enough tokens available"
        );

        tokensSold += _amount;
        require(
            tokensSold <= maxTokens,
            "Purchase would exceed max allowed tokens"
        );

        require(
            token.transfer(msg.sender, _amount),
            "Failed to transfer tokens"
        );

        emit Buy(_amount, msg.sender);
    }

    // Admin function to adjust the token price
    function setPrice(uint256 _price) public onlyOwner {
        price = _price;
    }

    // Function to add an address to the whitelist, callable only by the owner
    function addToWhitelist(address _user) public onlyOwner {
        whitelisted[_user] = true;
        emit Whitelisted(_user);
    }

    // Function to set the start time for the crowdsale, callable only by the owner
    function openCrowdsale(uint256 _startTime) public onlyOwner {
        startTime = _startTime;
        emit CrowdsaleOpened(_startTime);
    }

    // Finalizes the crowdsale, can only be called by the owner
    function finalize() public onlyOwner whenOpen {
        uint256 remainingTokens = token.balanceOf(address(this));
        if (remainingTokens > 0) {
            require(
                token.transfer(owner, remainingTokens),
                "Failed to return remaining tokens"
            );
        }

        // Transfer all collected ETH to the owner
        uint256 value = address(this).balance;
        (bool sent, ) = owner.call{value: value}("");
        require(sent, "Failed to send Ether");

        emit Finalize(tokensSold, value);
    }
}
