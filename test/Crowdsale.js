const {
  loadFixture,
} = require('@nomicfoundation/hardhat-toolbox/network-helpers');
const { expect } = require('chai');

describe('Crowdsale contract', function () {
  async function deployCrowdsaleFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const crowdsale = await ethers.deployContract('Crowdsale');

    // Fixtures can return anything you consider useful for your tests
    return { crowdsale, owner, addr1, addr2 };
  }

  it('Deployment should assigne the correct name', async function () {
    const { crowdsale, owner, addr1, addr2 } = await loadFixture(
      deployCrowdsaleFixture
    );
    expect(await crowdsale.name()).to.equal('Crowdsale');
  });
});
