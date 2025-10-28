// Generate market data
const marketData = [];
let marketPrice = 4500;
const marketReturn = 0.001;

for (let i = 0; i < 250; i++) {
  const date = new Date(2024, 0, 1 + i);
  const dateStr = date.toISOString().split("T")[0];
  
  marketData.push({
    date: dateStr,
    close: Math.round(marketPrice * 100) / 100,
  });
  
  marketPrice = marketPrice * (1 + marketReturn);
}

// Generate defensive stock (beta 0.5)
const stockData = [];
let stockPrice = 100;
const stockReturn = 0.5 * marketReturn;

for (let i = 0; i < marketData.length; i++) {
  stockData.push({
    date: marketData[i].date,
    close: Math.round(stockPrice * 100) / 100,
  });
  
  stockPrice = stockPrice * (1 + stockReturn);
}

console.log('Market prices (last 5):', marketData.slice(-5).map(d => d.close));
console.log('Stock prices (last 5):', stockData.slice(-5).map(d => d.close));

// Calculate log returns
function calculateLogReturns(prices) {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    const logReturn = Math.log(prices[i] / prices[i - 1]);
    returns.push(logReturn);
  }
  return returns;
}

const marketPrices = marketData.map(d => d.close);
const stockPrices = stockData.map(d => d.close);
const mktReturns = calculateLogReturns(marketPrices);
const stkReturns = calculateLogReturns(stockPrices);

console.log('Market returns (last 5):', mktReturns.slice(-5));
console.log('Stock returns (last 5):', stkReturns.slice(-5));

// Calculate regression
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
console.log('Calculated beta:', slope);
console.log('Expected beta: 0.5');
