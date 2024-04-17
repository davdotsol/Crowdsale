// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

import "hardhat/console.sol";
import "./Token.sol";

// Crowdsale contract for managing the sale of ERC-20 tokens
contract Crowdsale {
    address public owner;
    Token public token;
    uint256 public price;
    uint256 public maxTokens;
    uint256 public tokensSold;

    // Events for logging buys and finalization actions
    event Buy(uint256 amount, address buyer);
    event Finalize(uint256 tokensSold, uint256 ethRaised);

    // Set up the Crowdsale with a reference to the ERC-20 Token contract and initial sale parameters
    constructor(Token _token, uint256 _price, uint256 _maxTokens) {
        owner = msg.sender;
        token = _token;
        price = _price;
        maxTokens = _maxTokens;
    }

    // Modifier to restrict calls to only the owner of the contract
    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    // Fallback function to handle ETH sent directly to the contract
    receive() external payable {
        uint256 amount = (msg.value / price) * 1e18; // Convert ETH to token amount
        buyTokens(amount);
    }

    // Public function to buy tokens
    function buyTokens(uint256 _amount) public payable {
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

    // Finalizes the crowdsale, can only be called by the owner
    function finalize() public onlyOwner {
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
