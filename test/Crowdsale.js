const {
  loadFixture,
} = require('@nomicfoundation/hardhat-toolbox/network-helpers');
const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (m) => {
  return ethers.parseUnits(m.toString(), 18);
};

describe('Crowdsale contract', function () {
  async function deployCrowdsaleFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const Token = await ethers.getContractFactory('Token');
    const ddsToken = await Token.deploy('Dapp Dot Sol', 'DDS', '1000000');

    await ddsToken.waitForDeployment();

    const currentTime = (await ethers.provider.getBlock('latest')).timestamp;
    const startTime = currentTime - 3600; // Crowdsale started 1 hour ago
    const endTime = currentTime + 86400; // Crowdsale ends in 1 day
    const minContribution = ethers.parseUnits('10', 18); // Minimum contribution
    const maxContribution = ethers.parseUnits('100', 18); // Maximum contribution
    const fundingGoal = ethers.parseEther('50'); // Funding goal in ether

    const Crowdsale = await ethers.getContractFactory('Crowdsale');
    const crowdsale = await Crowdsale.deploy(
      ddsToken.target,
      ethers.parseEther('1'),
      '1000000',
      startTime,
      endTime,
      minContribution,
      maxContribution,
      fundingGoal
    );

    await crowdsale.waitForDeployment();

    let tx = await ddsToken
      .connect(owner)
      .transfer(crowdsale.target, ethers.parseUnits('1000000', 18));
    await tx.wait();

    await crowdsale.addToWhitelist(owner);
    await crowdsale.addToWhitelist(addr1);
    await crowdsale.addToWhitelist(addr2);

    return { crowdsale, ddsToken, owner, addr1, addr2 };
  }

  async function deployCrowdsaleFinalizeFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const Token = await ethers.getContractFactory('Token');
    const ddsToken = await Token.deploy('Dapp Dot Sol', 'DDS', '1000000');

    await ddsToken.waitForDeployment();

    const currentTime = (await ethers.provider.getBlock('latest')).timestamp;
    const startTime = currentTime - 300; // Crowdsale started 5 minutes ago
    const endTime = currentTime + 300; // Crowdsale ends in 5 minutes
    const minContribution = ethers.parseUnits('10', 18); // Minimum contribution
    const maxContribution = ethers.parseUnits('100', 18); // Maximum contribution
    const fundingGoal = ethers.parseEther('50'); // Funding goal in ether

    const Crowdsale = await ethers.getContractFactory('Crowdsale');
    const crowdsale = await Crowdsale.deploy(
      ddsToken.target,
      ethers.parseEther('1'),
      '1000000',
      startTime,
      endTime,
      minContribution,
      maxContribution,
      fundingGoal
    );

    await crowdsale.waitForDeployment();

    let tx = await ddsToken
      .connect(owner)
      .transfer(crowdsale.target, ethers.parseUnits('1000000', 18));
    await tx.wait();

    await crowdsale.addToWhitelist(owner);
    await crowdsale.addToWhitelist(addr1);
    await crowdsale.addToWhitelist(addr2);

    tx = await crowdsale.connect(addr1).buyTokens(tokens(50), {
      value: ethers.parseEther('50'),
    });
    await tx.wait();

    // Increase blockchain time to after endTime
    await network.provider.send('evm_increaseTime', [3600]); // Increase time by 1 hour
    await network.provider.send('evm_mine'); // Mine a new block to confirm the time change

    return { crowdsale, ddsToken, owner, addr1, addr2 };
  }

  it('Deployment should return the correct token address', async function () {
    const { crowdsale, ddsToken } = await loadFixture(deployCrowdsaleFixture);
    expect(await crowdsale.token()).to.equal(ddsToken.target);
  });

  it('sends tokens to the Crowdsale contract', async function () {
    const { crowdsale, ddsToken } = await loadFixture(deployCrowdsaleFixture);
    expect(await ddsToken.balanceOf(crowdsale.target)).to.equal(
      ethers.parseUnits('1000000', 18)
    );
  });

  it('Should return the correct price', async function () {
    const { crowdsale } = await loadFixture(deployCrowdsaleFixture);
    expect(await crowdsale.price()).to.equal(ethers.parseEther('1'));
  });

  describe('Buying Tokens', function () {
    it('Should transfer tokens upon purchase', async function () {
      const { crowdsale, ddsToken, addr1 } = await loadFixture(
        deployCrowdsaleFixture
      );
      let tx = await crowdsale.connect(addr1).buyTokens(tokens(10), {
        value: ethers.parseEther('10'),
      });
      await tx.wait();
      expect(await ddsToken.balanceOf(crowdsale.target)).to.equal(
        ethers.parseUnits('999990', 18)
      );
      expect(await ddsToken.balanceOf(addr1)).to.equal(tokens(10));
    });

    it('Should update the contract ether balance after purchase', async function () {
      const { crowdsale, addr1 } = await loadFixture(deployCrowdsaleFixture);

      let tx = await crowdsale.connect(addr1).buyTokens(tokens(10), {
        value: ethers.parseEther('10'),
      });
      await tx.wait();

      expect(await ethers.provider.getBalance(crowdsale.target)).to.equal(
        tokens(10)
      );
    });

    it('Should update tokens sold balance', async function () {
      const { crowdsale, addr1 } = await loadFixture(deployCrowdsaleFixture);

      let tx = await crowdsale.connect(addr1).buyTokens(tokens(10), {
        value: ethers.parseEther('10'),
      });
      await tx.wait();

      expect(await crowdsale.tokensSold()).to.equal(tokens(10));
    });

    it('Should reject insufficient ETH', async function () {
      const { crowdsale, addr1 } = await loadFixture(deployCrowdsaleFixture);

      await expect(
        crowdsale.connect(addr1).buyTokens(tokens(10), {
          value: ethers.parseEther('0'),
        })
      ).to.be.reverted;
    });

    it('Should emit a buy event', async function () {
      const { crowdsale, addr1 } = await loadFixture(deployCrowdsaleFixture);

      await expect(
        crowdsale.connect(addr1).buyTokens(tokens(10), {
          value: ethers.parseEther('10'),
        })
      )
        .to.emit(crowdsale, 'Buy')
        .withArgs(tokens(10), addr1.address);
    });
  });

  describe('Sending ETH', function () {
    it('Should update the contract ether balance', async function () {
      const { crowdsale, addr1 } = await loadFixture(deployCrowdsaleFixture);

      let tx = await addr1.sendTransaction({
        to: crowdsale.target,
        value: tokens(10),
      });
      await tx.wait();

      expect(await ethers.provider.getBalance(crowdsale.target)).to.equal(
        tokens(10)
      );
    });

    it('Should update user token balance', async function () {
      const { crowdsale, ddsToken, addr1 } = await loadFixture(
        deployCrowdsaleFixture
      );

      let tx = await addr1.sendTransaction({
        to: crowdsale.target,
        value: tokens(10),
      });
      await tx.wait();

      expect(await ddsToken.balanceOf(addr1)).to.equal(tokens(10));
    });
  });

  describe('Update price', function () {
    let price = ethers.parseEther('2');
    it('Should transfers remaining tokens to owner', async function () {
      const { crowdsale } = await loadFixture(deployCrowdsaleFixture);
      let tx = await crowdsale.setPrice(price);
      await tx.wait();

      expect(await crowdsale.price()).to.equal(ethers.parseEther('2'));
    });

    it('Should prevents non-owner from updating the price', async function () {
      const { crowdsale, addr1 } = await loadFixture(deployCrowdsaleFixture);
      await expect(crowdsale.connect(addr1).setPrice(price)).to.be.reverted;
    });
  });

  describe('Finalizing the sale', function () {
    it('Should transfers remaining tokens to owner', async function () {
      const { crowdsale, ddsToken, owner } = await loadFixture(
        deployCrowdsaleFinalizeFixture
      );

      let tx = await crowdsale.finalize();
      await tx.wait();
      expect(await ddsToken.balanceOf(crowdsale.target)).to.equal('0');
      expect(await ddsToken.balanceOf(owner)).to.equal(
        ethers.parseUnits('999950', 18)
      );
    });

    it('Should transfers ETH balance to owner', async function () {
      const { crowdsale, owner, addr1 } = await loadFixture(
        deployCrowdsaleFinalizeFixture
      );

      let tx = await crowdsale.finalize();
      await tx.wait();
      expect(await ethers.provider.getBalance(crowdsale.target)).to.equal('0');
    });

    it('Should emit a finalize event', async function () {
      const { crowdsale, owner, addr1 } = await loadFixture(
        deployCrowdsaleFinalizeFixture
      );

      await expect(crowdsale.finalize())
        .to.emit(crowdsale, 'Finalize')
        .withArgs(tokens(50), ethers.parseEther('0'));
    });

    it('Should prevents non-owner from finalizing', async function () {
      const { crowdsale, addr1 } = await loadFixture(
        deployCrowdsaleFinalizeFixture
      );

      await expect(crowdsale.connect(addr1).finalize()).to.be.reverted;
    });
  });
});
