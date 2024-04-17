const {
  loadFixture,
} = require('@nomicfoundation/hardhat-toolbox/network-helpers');
const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Crowdsale contract', function () {
  async function deployCrowdsaleFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const Token = await ethers.getContractFactory('Token');
    const ddsToken = await Token.deploy('Dapp Dot Sol', 'DDS', 1000000);

    await ddsToken.waitForDeployment();

    const Crowdsale = await ethers.getContractFactory('Crowdsale');
    const crowdsale = await Crowdsale.deploy(
      ddsToken.target,
      ethers.parseEther('1'),
      1000000
    );

    await crowdsale.waitForDeployment();

    let tx = await ddsToken.transfer(
      crowdsale.target,
      '1000000000000000000000000'
    );
    await tx.wait();

    // Fixtures can return anything you consider useful for your tests
    return { crowdsale, ddsToken, owner, addr1, addr2 };
  }

  it('Deployment should return the correct token address', async function () {
    const { crowdsale, ddsToken } = await loadFixture(deployCrowdsaleFixture);
    expect(await crowdsale.token()).to.equal(ddsToken.target);
  });

  it('sends tokens to the Crowdsale contract', async function () {
    const { crowdsale, ddsToken } = await loadFixture(deployCrowdsaleFixture);
    expect(await ddsToken.balanceOf(crowdsale.target)).to.equal(
      '1000000000000000000000000'
    );
  });

  it('Should return the correct price', async function () {
    const { crowdsale, ddsToken } = await loadFixture(deployCrowdsaleFixture);
    expect(await crowdsale.price()).to.equal(ethers.parseEther('1'));
  });

  describe('Buying Tokens', function () {
    it('Should transfer tokens', async function () {
      const { crowdsale, ddsToken, owner, addr1 } = await loadFixture(
        deployCrowdsaleFixture
      );
      let tx = await crowdsale
        .connect(addr1)
        .buyTokens('10000000000000000000', { value: ethers.parseEther('10') });
      let result = await tx.wait();
      expect(await ddsToken.balanceOf(crowdsale.target)).to.equal(
        '999990000000000000000000'
      );
      expect(await ddsToken.balanceOf(addr1)).to.equal('10000000000000000000');
    });

    it('Should update the contract ether balance', async function () {
      const { crowdsale, ddsToken, owner, addr1 } = await loadFixture(
        deployCrowdsaleFixture
      );

      let tx = await crowdsale
        .connect(addr1)
        .buyTokens('10000000000000000000', { value: ethers.parseEther('10') });
      let result = await tx.wait();

      expect(await ethers.provider.getBalance(crowdsale.target)).to.equal(
        '10000000000000000000'
      );
    });

    it('Should update tokens sold balance', async function () {
      const { crowdsale, ddsToken, owner, addr1 } = await loadFixture(
        deployCrowdsaleFixture
      );

      let tx = await crowdsale
        .connect(addr1)
        .buyTokens('10000000000000000000', { value: ethers.parseEther('10') });
      let result = await tx.wait();

      expect(await crowdsale.tokensSold()).to.equal('10000000000000000000');
    });

    it('Should reject insufficient ETH', async function () {
      const { crowdsale, ddsToken, owner, addr1 } = await loadFixture(
        deployCrowdsaleFixture
      );

      await expect(
        crowdsale
          .connect(addr1)
          .buyTokens('10000000000000000000', { value: ethers.parseEther('0') })
      ).to.be.reverted;
    });

    it('Should emit a buy event', async function () {
      const { crowdsale, ddsToken, owner, addr1 } = await loadFixture(
        deployCrowdsaleFixture
      );

      await expect(
        crowdsale
          .connect(addr1)
          .buyTokens('10000000000000000000', { value: ethers.parseEther('10') })
      )
        .to.emit(crowdsale, 'Buy')
        .withArgs('10000000000000000000', addr1.address);
    });
  });

  describe('Sending ETH', function () {
    it('Should update the contract ether balance', async function () {
      const { crowdsale, ddsToken, owner, addr1 } = await loadFixture(
        deployCrowdsaleFixture
      );

      let tx = await addr1.sendTransaction({
        to: crowdsale.target,
        value: '10000000000000000000',
      });
      let result = await tx.wait();

      expect(await ethers.provider.getBalance(crowdsale.target)).to.equal(
        '10000000000000000000'
      );
    });

    it('Should update user token balance', async function () {
      const { crowdsale, ddsToken, owner, addr1 } = await loadFixture(
        deployCrowdsaleFixture
      );

      let tx = await addr1.sendTransaction({
        to: crowdsale.target,
        value: '10000000000000000000',
      });
      let result = await tx.wait();

      expect(await ddsToken.balanceOf(addr1)).to.equal('10000000000000000000');
    });
  });

  describe('Update price', function () {
    let price = ethers.parseEther('2');
    it('Should transfers remaining tokens to owner', async function () {
      const { crowdsale, ddsToken, owner, addr1 } = await loadFixture(
        deployCrowdsaleFixture
      );
      let tx = await crowdsale.setPrice(price);
      await tx.wait();

      expect(await crowdsale.price()).to.equal(ethers.parseEther('2'));
    });

    it('Should prevents non-owner from updating the price', async function () {
      const { crowdsale, ddsToken, owner, addr1 } = await loadFixture(
        deployCrowdsaleFixture
      );
      await expect(crowdsale.connect(addr1).setPrice(price)).to.be.reverted;
    });
  });

  describe('Finalizing the sale', function () {
    it('Should transfers remaining tokens to owner', async function () {
      const { crowdsale, ddsToken, owner, addr1 } = await loadFixture(
        deployCrowdsaleFixture
      );
      let tx = await crowdsale
        .connect(addr1)
        .buyTokens('10000000000000000000', { value: ethers.parseEther('10') });
      let result = await tx.wait();

      tx = await crowdsale.finalize();
      result = await tx.wait();
      expect(await ddsToken.balanceOf(crowdsale.target)).to.equal('0');
      expect(await ddsToken.balanceOf(owner)).to.equal(
        '999990000000000000000000'
      );
    });

    it('Should transfers ETH balance to owner', async function () {
      const { crowdsale, ddsToken, owner, addr1 } = await loadFixture(
        deployCrowdsaleFixture
      );
      let tx = await crowdsale
        .connect(addr1)
        .buyTokens('10000000000000000000', { value: ethers.parseEther('10') });
      let result = await tx.wait();

      tx = await crowdsale.finalize();
      result = await tx.wait();
      expect(await ethers.provider.getBalance(crowdsale.target)).to.equal('0');
    });

    it('Should emit a finalize event', async function () {
      const { crowdsale, ddsToken, owner, addr1 } = await loadFixture(
        deployCrowdsaleFixture
      );
      let tx = await crowdsale
        .connect(addr1)
        .buyTokens('10000000000000000000', { value: ethers.parseEther('10') });
      let result = await tx.wait();

      await expect(crowdsale.finalize())
        .to.emit(crowdsale, 'Finalize')
        .withArgs('10000000000000000000', ethers.parseEther('10'));
    });

    it('Should prevents non-owner from finalizing', async function () {
      const { crowdsale, ddsToken, owner, addr1 } = await loadFixture(
        deployCrowdsaleFixture
      );
      let tx = await crowdsale
        .connect(addr1)
        .buyTokens('10000000000000000000', { value: ethers.parseEther('10') });
      let result = await tx.wait();

      await expect(crowdsale.connect(addr1).finalize()).to.be.reverted;
    });
  });
});
