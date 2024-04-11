// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

import "hardhat/console.sol";
import "./Token.sol";

contract Crowdsale {
    string public name = "Crowdsale";
    Token public token;

    constructor(Token _token) {
        token = _token;
    }
}
