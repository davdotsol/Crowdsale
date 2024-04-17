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
    const ddsToken = await Token.deploy('Dapp Dot Sol', 'DDS', 1000000);

    await ddsToken.waitForDeployment();

    const Crowdsale = await ethers.getContractFactory('Crowdsale');
    const crowdsale = await Crowdsale.deploy(
      ddsToken.target,
      ethers.parseEther('1'),
      ethers.parseUnits('1000000', 18)
    );

    await crowdsale.waitForDeployment();

    let tx = await ddsToken
      .connect(owner)
      .transfer(crowdsale.target, ethers.parseUnits('1000000', 18));
    await tx.wait();

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
      const { crowdsale, ddsToken, owner, addr1 } = await loadFixture(
        deployCrowdsaleFixture
      );
      let tx = await crowdsale.connect(addr1).buyTokens(tokens(10), {
        value: ethers.parseEther('10'),
      });
      let result = await tx.wait();

      tx = await crowdsale.finalize();
      result = await tx.wait();
      expect(await ddsToken.balanceOf(crowdsale.target)).to.equal('0');
      expect(await ddsToken.balanceOf(owner)).to.equal(
        ethers.parseUnits('999990', 18)
      );
    });

    it('Should transfers ETH balance to owner', async function () {
      const { crowdsale, addr1 } = await loadFixture(deployCrowdsaleFixture);
      let tx = await crowdsale.connect(addr1).buyTokens(tokens(10), {
        value: ethers.parseEther('10'),
      });
      let result = await tx.wait();

      tx = await crowdsale.finalize();
      result = await tx.wait();
      expect(await ethers.provider.getBalance(crowdsale.target)).to.equal('0');
    });

    it('Should emit a finalize event', async function () {
      const { crowdsale, addr1 } = await loadFixture(deployCrowdsaleFixture);
      let tx = await crowdsale.connect(addr1).buyTokens(tokens(10), {
        value: ethers.parseEther('10'),
      });
      await tx.wait();

      await expect(crowdsale.finalize())
        .to.emit(crowdsale, 'Finalize')
        .withArgs(tokens(10), ethers.parseEther('10'));
    });

    it('Should prevents non-owner from finalizing', async function () {
      const { crowdsale, addr1 } = await loadFixture(deployCrowdsaleFixture);
      let tx = await crowdsale.connect(addr1).buyTokens(tokens(10), {
        value: ethers.parseEther('10'),
      });
      await tx.wait();

      await expect(crowdsale.connect(addr1).finalize()).to.be.reverted;
    });
  });
});
