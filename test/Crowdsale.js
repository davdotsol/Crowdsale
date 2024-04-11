const {
  loadFixture,
} = require('@nomicfoundation/hardhat-toolbox/network-helpers');
const { expect } = require('chai');

describe('Crowdsale contract', function () {
  async function deployCrowdsaleFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const Token = await ethers.getContractFactory('Token');
    const ddsToken = await Token.deploy('Dapp Dot Sol', 'DDS', 1000000);

    await ddsToken.waitForDeployment();

    const Crowdsale = await ethers.getContractFactory('Crowdsale');
    const crowdsale = await Crowdsale.deploy(ddsToken.target);

    await crowdsale.waitForDeployment();

    // Fixtures can return anything you consider useful for your tests
    return { crowdsale, ddsToken, owner, addr1, addr2 };
  }

  it('Deployment should assigne the correct name', async function () {
    const { crowdsale } = await loadFixture(deployCrowdsaleFixture);
    expect(await crowdsale.name()).to.equal('Crowdsale');
  });

  it('Deployment should return the correct token address', async function () {
    const { crowdsale, ddsToken } = await loadFixture(deployCrowdsaleFixture);
    expect(await crowdsale.token()).to.equal(ddsToken.target);
  });
});
