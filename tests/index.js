const { Wallet } = require('../');
const config = require('../config');

describe('Wallet Tests', () => {
  let wallet;

  before(() => {
    wallet = Wallet(config);
  }); 

  it('should create a single key wallet', (done) => {
    wallet.createWallet({
      name: 'SingleBringle',
      copayer: 'null',
      mRequiredKeys: 1,
      nTotalKeys: 1,
      ext: {
        network: 'testnet'
      }
    })
    .then(res => {
      done();
    })
    .catch(done);
  });
});

