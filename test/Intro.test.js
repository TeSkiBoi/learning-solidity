const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Intro", function () {
  it("Should expose helloWorld constant", async function () {
    const Intro = await ethers.getContractFactory("Intro");
    const intro = await Intro.deploy();
    await intro.waitForDeployment();

    expect(await intro.helloWorld()).to.equal("Hello World");
  });

  it("Should return Hello World from sayHello()", async function () {
    const Intro = await ethers.getContractFactory("Intro");
    const intro = await Intro.deploy();
    await intro.waitForDeployment();

    expect(await intro.sayHello()).to.equal("Hello World");
  });
});
