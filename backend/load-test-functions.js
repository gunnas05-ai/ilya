// Artillery load test processor functions
// Kullanilan degiskenler ve yardimci fonksiyonlar

// Rastgele kullanici uret (her istekte farkli kullanici simulasyonu)
function generateRandomUser(userContext, events, done) {
  const suffixes = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'test'];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  userContext.vars.email = `loadtest_${suffix}_${Date.now()}@kaptan.com`;
  userContext.vars.password = 'test123';
  return done();
}

// Rastgele teklif tutari
function randomBidAmount(userContext, events, done) {
  userContext.vars.bidAmount = Math.floor(Math.random() * 40000) + 5000;
  return done();
}

module.exports = {
  generateRandomUser,
  randomBidAmount,
};
