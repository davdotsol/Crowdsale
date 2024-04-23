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
  const startTime = m.getParameter(
    'startTime',
    Math.floor(Date.now() / 1000) - 3600
  ); // 1 hour ago from now
  const endTime = m.getParameter(
    'endTime',
    Math.floor(Date.now() / 1000) + 86400
  ); // 1 day from now
  const minContribution = m.getParameter('minContribution', '10'); // Minimum contribution tokens
  const maxContribution = m.getParameter('maxContribution', '10000'); // Maximum contribution tokens
  const fundingGoal = m.getParameter(
    'fundingGoal',
    hre.ethers.parseEther('50')
  ); // Funding goal in ether

  const crowdsale = m.contract('Crowdsale', [
    token,
    price,
    maxTokens,
    startTime,
    endTime,
    minContribution,
    maxContribution,
    fundingGoal,
  ]);

  m.call(token, 'transfer', [crowdsale, ethers.parseUnits('1000000', 18)]);

  return { crowdsale, token };
});

module.exports = CrowdsaleModule;
