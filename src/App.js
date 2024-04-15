import { useEffect, useState } from 'react';
import Navigation from './components/Navigation';
import { ethers } from 'ethers';
import Info from './components/Info';

function App() {
  const [account, setAccount] = useState(null);

  const loadBlockchainData = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);

    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });
    const account = ethers.getAddress(accounts[0]);
    setAccount(account);
  };

  useEffect(() => {
    loadBlockchainData();
  }, []);

  return (
    <div className="container mx-auto px-4">
      <Navigation />
      <hr />
      {account && <Info account={account} />}
    </div>
  );
}

export default App;
