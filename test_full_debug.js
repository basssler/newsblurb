function calculateLogReturns(prices) {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    const logReturn = Math.log(prices[i] / prices[i - 1]);
    returns.push(logReturn);
  }
  return returns;
}

// Generate prices like our data generator
const marketPrices = [4500];
const stockPrices = [100];

let marketPrice = 4500;
let stockPrice = 100;
const marketReturn = 0.001;
const beta = 0.5;
const stockReturn = beta * marketReturn;

for (let i = 1; i < 250; i++) {
  marketPrice = marketPrice * (1 + marketReturn);
  stockPrice = stockPrice * (1 + stockReturn);
  marketPrices.push(Math.round(marketPrice * 100) / 100);
  stockPrices.push(Math.round(stockPrice * 100) / 100);
}

const mktReturns = calculateLogReturns(marketPrices);
const stkReturns = calculateLogReturns(stockPrices);

console.log('Market prices (first 5):', marketPrices.slice(0, 5));
console.log('Stock prices (first 5):', stockPrices.slice(0, 5));
console.log('Market returns (first 5):', mktReturns.slice(0, 5));
console.log('Stock returns (first 5):', stkReturns.slice(0, 5));

// Now check the slopes
function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function covariance(x, y) {
  const xMean = mean(x);
  const yMean = mean(y);
  let sum = 0;
  for (let i = 0; i < x.length; i++) {
    sum += (x[i] - xMean) * (y[i] - yMean);
  }
  return sum / (x.length - 1);
}

function variance(arr) {
  const avg = mean(arr);
  const squaredDiffs = arr.map((x) => Math.pow(x - avg, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / (arr.length - 1);
}

const slope = covariance(mktReturns, stkReturns) / variance(mktReturns);
console.log('Calculated slope (beta):', slope);
console.log('Expected beta: 0.5');
