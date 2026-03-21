// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Intro
 * @dev Minimal contract: your first Solidity program on Avalanche
 */
contract Intro {
    string public constant helloWorld = "Hello World";

    function sayHello() external pure returns (string memory) {
        return "Hello World";
    }
}
