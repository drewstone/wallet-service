const Wallet = require('./wallet');

module.exports = (config) => {
  const WalletService = Wallet(config);
  
  return {
    WalletService
  }
};
