const { WalletService } = require('./index');

let w;
const sampleWallet = {
  name: 'Sample',
  copayer: 'Drew',
  m: 1,
  n:1,
  ext: {
    network: 'testnet'
  }
}

WalletService()
.then(wallet => {
  w = wallet;
  return w.createNewWallet(sampleWallet);
})
.then(success => {
  if (!success) console.log('Failed to create new wallet');
  return w.sendTransaction({
    walletName: sampleWallet.name,
    payment: {
      to: 'Johnny',
      amount: 1
    }
  });
});
