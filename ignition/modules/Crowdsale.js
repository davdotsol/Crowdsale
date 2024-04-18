const { buildModule } = require('@nomicfoundation/hardhat-ignition/modules');
const hre = require('hardhat');

const CrowdsaleModule = buildModule('CrowdsaleModule', (m) => {
  const name = m.getParameter('name', 'Dapp Dot Sol');
  const symbol = m.getParameter('symbol', 'DDS');
  const totalSupply = m.getParameter('totalSupply', 1000000);
  const token = m.contract('Token', [name, symbol, totalSupply]);
  //Token _token, uint256 _price, uint256 _maxTokens
  const price = m.getParameter('price', hre.ethers.parseEther('1'));
  const maxTokens = m.getParameter('maxTokens', '1000000');
  const crowdsale = m.contract('Crowdsale', [token, price, maxTokens]);
  console.log(crowdsale);

  m.call(token, 'transfer', [crowdsale, ethers.parseUnits('1000000', 18)]);

  return { crowdsale, token };
});

module.exports = CrowdsaleModule;
