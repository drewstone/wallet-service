const { WalletService } = require('./index');

const wallet = WalletService();
const sampleWallet = {
  file: [process.env.PWD, '/data/.wallet.dat'].join(''),
  name: 'Sample',
  copayer: 'Drew',
  m: 1,
  n:1,
  ext: {
    network: 'testnet'
  }
}

wallet.createWallet(sampleWallet)
.then(result => {
  
})
.catch(err => {
  return wallet.getBalance(sampleWallet);
})
.then(balance => {
  console.log(balance);
});
