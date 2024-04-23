import { useEffect, useState } from 'react';
import Navigation from './components/Navigation';
import { ethers } from 'ethers';
import Info from './components/Info';

import TOKEN_ABI from './abis/Token.json';
import CROWDSALE_ABI from './abis/Crowdsale.json';

import config from './config.json';
import Loading from './components/Loading';
import Progress from './components/Progress';
import Buy from './components/Buy';
import RefundButton from './components/RefundButton';

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [crowdsale, setCrowdsale] = useState(null);
  const [accountBalance, setAccountBalance] = useState(0);
  const [price, setPrice] = useState(0);
  const [maxTokens, setMaxTokens] = useState(0);
  const [tokensSold, setTokensSold] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [crowdsaleOpen, setCrowdsaleOpen] = useState(false);
  const [crowdsaleClosed, setCrowdsaleClosed] = useState(false);
  const [minContribution, setMinContribution] = useState(0);
  const [maxContribution, setMaxContribution] = useState(0);
  const [fundingGoalReached, setFundingGoalReached] = useState(false);

  const loadBlockchainData = async () => {
    const tempProvider = new ethers.BrowserProvider(window.ethereum);
    setProvider(tempProvider);

    const { chainId } = await tempProvider.getNetwork();

    const tempToken = new ethers.Contract(
      config[chainId].token.address,
      TOKEN_ABI,
      tempProvider
    );
    const tempCrowdsale = new ethers.Contract(
      config[chainId].crowdsale.address,
      CROWDSALE_ABI,
      tempProvider
    );

    setCrowdsale(tempCrowdsale);

    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });
    const tempAccount = ethers.getAddress(accounts[0]);
    setAccount(tempAccount);

    const tempAccountBalance = ethers.formatUnits(
      await tempToken.balanceOf(tempAccount),
      18
    );
    setAccountBalance(tempAccountBalance);

    const tempPrice = ethers.formatUnits(await tempCrowdsale.price(), 18);
    setPrice(tempPrice);

    const tempMaxTokens = (await tempCrowdsale.maxTokens()).toString();
    setMaxTokens(tempMaxTokens);

    const tempTokensSold = (await tempCrowdsale.tokensSold()).toString();
    setTokensSold(tempTokensSold);

    const tempIsWhitelisted = await tempCrowdsale.isWhiteListed(tempAccount);
    setIsWhitelisted(tempIsWhitelisted);

    const tempCrowdsaleClosed = await tempCrowdsale.crowdsaleClosed();
    setCrowdsaleClosed(tempCrowdsaleClosed);

    const tempCrowdsaleOpen =
      !(await tempCrowdsale.crowdsaleClosed()) &&
      (await tempCrowdsale.startTime()) <= Date.now() / 1000 &&
      (await tempCrowdsale.endTime()) >= Date.now() / 1000;
    setCrowdsaleOpen(tempCrowdsaleOpen);

    const tempMinContribution = (
      await tempCrowdsale.minContribution()
    ).toString();
    setMinContribution(tempMinContribution);

    const tempMaxContribution = (
      await tempCrowdsale.maxContribution()
    ).toString();
    setMaxContribution(tempMaxContribution);

    const tempFundingGoalReached = await tempCrowdsale.isFundingGoalReached();
    setFundingGoalReached(tempFundingGoalReached);

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

      <h1 className="my-4 text-center">Introducing My Token</h1>

      {isLoading ? (
        <Loading />
      ) : (
        <>
          {!isWhitelisted ? (
            <p className="text-center">
              You are not whitelisted to participate.
            </p>
          ) : (
            <>
              {crowdsaleOpen ? (
                <>
                  <p className="text-center">
                    <strong>Current Price:</strong> {price} ETH
                  </p>
                  <p className="text-center">
                    <strong>Min Contribution:</strong> {minContribution} Tokens
                  </p>
                  <p className="text-center">
                    <strong>Max Contribution:</strong> {maxContribution} Tokens
                  </p>
                  <Buy
                    provider={provider}
                    price={price}
                    minContribution={minContribution}
                    maxContribution={maxContribution}
                    crowdsale={crowdsale}
                    setIsLoading={setIsLoading}
                  />
                  <Progress tokensSold={tokensSold} maxTokens={maxTokens} />
                </>
              ) : (
                <p className="text-center">
                  The crowdsale is currently closed.
                </p>
              )}
            </>
          )}

          {crowdsaleClosed && !fundingGoalReached && (
            <>
              <p className="text-center">
                Funding goal not reached. You can claim a refund.
              </p>
              <RefundButton crowdsale={crowdsale} account={account} />
            </>
          )}
        </>
      )}

      <hr />
      {account && <Info account={account} accountBalance={accountBalance} />}
    </div>
  );
}

export default App;
