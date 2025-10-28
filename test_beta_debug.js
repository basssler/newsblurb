const prices = [100];
let price = 100;
const marketReturn = 0.001;
const beta = 0.5;
const stockReturn = beta * marketReturn;

for (let i = 1; i < 250; i++) {
  price = price * (1 + stockReturn);
  prices.push(Math.round(price * 100) / 100);
}

console.log('First 10 prices:', prices.slice(0, 10));
console.log('Last 10 prices:', prices.slice(-10));

// Calculate log returns
const returns = [];
for (let i = 1; i < prices.length; i++) {
  const logReturn = Math.log(prices[i] / prices[i - 1]);
  returns.push(logReturn);
}

console.log('First 10 log returns:', returns.slice(0, 10));
console.log('Average return:', returns.reduce((a, b) => a + b, 0) / returns.length);
console.log('Expected return:', beta * marketReturn);
