import { useEffect, useState } from 'react';
import Navigation from './components/Navigation';
import { ethers } from 'ethers';
import Info from './components/Info';

import TOKEN_ABI from './abis/Token.json';
import CROWDSALE_ABI from './abis/Crowdsale.json';

import config from './config.json';
import Loading from './components/Loading';
import Progress from './components/Progress';

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [crowdsale, setCrowdsale] = useState(null);
  const [accountBalance, setAccountBalance] = useState(0);
  const [price, setPrice] = useState(0);
  const [maxTokens, setMaxTokens] = useState(0);
  const [tokensSold, setTokensSold] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadBlockchainData = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    setProvider(provider);

    const token = new ethers.Contract(
      config['31337'].token.address,
      TOKEN_ABI,
      provider
    );
    const crowdsale = new ethers.Contract(
      config['31337'].crowdsale.address,
      CROWDSALE_ABI,
      provider
    );

    setCrowdsale(crowdsale);

    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });
    const account = ethers.getAddress(accounts[0]);
    setAccount(account);

    const accountBalance = ethers.formatUnits(
      await token.balanceOf(account),
      18
    );
    setAccountBalance(accountBalance);

    const price = ethers.formatUnits(await crowdsale.price(), 18);
    setPrice(price);

    const maxTokens = ethers.formatUnits(await crowdsale.maxToken(), 18);
    setMaxTokens(maxTokens);

    const tokensSold = ethers.formatUnits(await crowdsale.tokensSold(), 18);
    setTokensSold(tokensSold);

    setIsLoading(false);
  };

  useEffect(() => {
    if (isLoading) {
      loadBlockchainData();
    }
  }, [isLoading]);

  return (
    <div className="container mx-auto px-4">
      <Navigation />

      <h1 className="my-4 text-center">Introducting My Token</h1>

      {isLoading ? (
        <Loading />
      ) : (
        <>
          <p className="text-center">
            <strong>Current Price: </strong>
            {price} ETH
          </p>
          <Progress tokensSold={tokensSold} maxTokens={maxTokens} />
        </>
      )}

      <hr />
      {account && <Info account={account} accountBalance={accountBalance} />}
    </div>
  );
}

export default App;
