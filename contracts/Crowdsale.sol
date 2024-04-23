// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

import "hardhat/console.sol";
import "./Token.sol";

// Crowdsale contract for managing the sale of ERC-20 tokens with whitelisting, open/close functionality, and refund capabilities
contract Crowdsale {
    address public owner;
    Token public token;
    uint256 public price;
    uint256 public maxTokens;
    uint256 public tokensSold;
    uint256 public startTime; // Timestamp for when the crowdsale should start
    uint256 public endTime; // Timestamp for when the crowdsale should end
    uint256 public minContribution; // Minimum number of tokens that must be purchased
    uint256 public maxContribution; // Maximum number of tokens that can be purchased in a single transaction
    uint256 public fundingGoal; // Minimum amount of funds to be raised
    bool private fundingGoalReached = false;
    bool public crowdsaleClosed = false;

    mapping(address => uint256) public balances;
    mapping(address => bool) private whitelisted;

    // Events for logging buys, finalization actions, whitelisting, status changes, and refunds
    event Buy(uint256 amount, address indexed buyer);
    event Finalize(uint256 tokensSold, uint256 ethRaised);
    event Whitelisted(address user);
    event CrowdsaleOpened(uint256 time);
    event CrowdsaleClosed(uint256 time);
    event RefundIssued(address recipient, uint256 amount);

    // Constructor to set up the Crowdsale with initial sale parameters
    constructor(
        Token _token,
        uint256 _price,
        uint256 _maxTokens,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _minContribution,
        uint256 _maxContribution,
        uint256 _fundingGoal
    ) {
        owner = msg.sender;
        token = _token;
        price = _price;
        maxTokens = _maxTokens;
        startTime = _startTime;
        endTime = _endTime;
        minContribution = _minContribution;
        maxContribution = _maxContribution;
        fundingGoal = _fundingGoal;
        whitelisted[owner] = true;
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
        require(
            block.timestamp >= startTime && block.timestamp <= endTime,
            "Crowdsale is not open"
        );
        require(!crowdsaleClosed, "Crowdsale is closed");
        _;
    }

    // Fallback function to handle ETH sent directly to the contract
    receive() external payable onlyWhitelisted whenOpen {
        buyTokens((msg.value / price) * 1e18);
    }

    // Public function to buy tokens, restricted to whitelisted addresses and only when open
    function buyTokens(
        uint256 _amount
    ) public payable onlyWhitelisted whenOpen {
        uint256 weiAmount = msg.value;
        console.log("weiAmount", weiAmount);
        console.log("_amount of tokens bought", _amount);
        console.log("minContribution", minContribution);
        console.log("maxContribution", maxContribution);
        require(
            (_amount / 1e18) >= minContribution &&
                (_amount / 1e18) <= maxContribution,
            "Amount of tokens bought is outside allowed contribution limits"
        );
        require(
            weiAmount == (_amount / 1e18) * price,
            "Ether value sent is not correct"
        );
        require(
            token.balanceOf(address(this)) >= _amount,
            "Not enough tokens available"
        );

        balances[msg.sender] += weiAmount;
        tokensSold += _amount;

        console.log("tokensSold", tokensSold);

        require(
            tokensSold <= maxTokens * 10 ** 18,
            "Purchase would exceed max allowed tokens"
        );
        require(
            token.transfer(msg.sender, _amount),
            "Failed to transfer tokens"
        );

        console.log("Emit buy event", (_amount / 1e18), msg.sender);

        emit Buy((_amount / 1e18), msg.sender);
    }

    // Allow investors to claim refunds if the funding goal is not reached
    function claimRefund() public {
        require(
            isFundingGoalReached() && block.timestamp > endTime,
            "Funding goal reached or Crowdsale not ended"
        );
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No funds to refund");

        balances[msg.sender] = 0;
        (bool refundSuccessful, ) = msg.sender.call{value: amount}("");
        require(refundSuccessful, "Refund failed");

        emit RefundIssued(msg.sender, amount);
    }

    function isWhiteListed(address _account) public view returns (bool) {
        return whitelisted[_account];
    }

    // Check if the funding goal was reached
    function isFundingGoalReached() public view returns (bool) {
        return address(this).balance >= fundingGoal;
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

    // Allows the owner to manually close the crowdsale early
    function closeCrowdsale() public onlyOwner {
        require(!crowdsaleClosed, "Crowdsale is already closed");
        require(block.timestamp >= startTime, "Crowdsale has not started yet");

        crowdsaleClosed = true;
        endTime = block.timestamp; // Update endTime to the current timestamp

        emit CrowdsaleClosed(block.timestamp);
    }

    // Finalizes the crowdsale, can only be called by the owner
    function finalize() public onlyOwner {
        require(!crowdsaleClosed, "Crowdsale already closed");
        require(block.timestamp > endTime, "Crowdsale not yet ended");

        crowdsaleClosed = true;
        fundingGoalReached = isFundingGoalReached();

        if (fundingGoalReached) {
            uint256 remainingTokens = token.balanceOf(address(this));
            if (remainingTokens > 0) {
                require(
                    token.transfer(owner, remainingTokens),
                    "Failed to return remaining tokens"
                );
            }
            (bool sent, ) = owner.call{value: address(this).balance}("");
            require(sent, "Failed to send Ether to owner");
        }

        emit Finalize(tokensSold, address(this).balance);
    }
}
