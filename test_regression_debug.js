// Replicate the linearRegression function
function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr) {
  if (arr.length < 2) return 0;
  const avg = mean(arr);
  const squaredDiffs = arr.map((x) => Math.pow(x - avg, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function covariance(x, y) {
  if (x.length !== y.length || x.length < 2) return 0;
  const xMean = mean(x);
  const yMean = mean(y);
  let sum = 0;
  for (let i = 0; i < x.length; i++) {
    sum += (x[i] - xMean) * (y[i] - yMean);
  }
  return sum / (x.length - 1);
}

function variance(arr) {
  if (arr.length < 2) return 0;
  const avg = mean(arr);
  const squaredDiffs = arr.map((x) => Math.pow(x - avg, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / (arr.length - 1);
}

function linearRegression(x, y) {
  if (x.length !== y.length || x.length < 2) {
    return {
      slope: 0,
      intercept: 0,
      rSquared: 0,
      correlation: 0,
    };
  }

  const xMean = mean(x);
  const yMean = mean(y);
  const cov = covariance(x, y);
  const xVariance = variance(x);

  if (xVariance === 0) {
    return {
      slope: 0,
      intercept: yMean,
      rSquared: 0,
      correlation: 0,
    };
  }

  const slope = cov / xVariance;
  const intercept = yMean - slope * xMean;

  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < x.length; i++) {
    const predicted = intercept + slope * x[i];
    const actual = y[i];
    ssRes += Math.pow(actual - predicted, 2);
    ssTot += Math.pow(actual - yMean, 2);
  }

  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  const xStdDev = stdDev(x);
  const yStdDev = stdDev(y);
  const correlation =
    xStdDev === 0 || yStdDev === 0 ? 0 : cov / (xStdDev * yStdDev);

  return {
    slope: Math.round(slope * 1000) / 1000,
    intercept: Math.round(intercept * 10000) / 10000,
    rSquared: Math.round(rSquared * 1000) / 1000,
    correlation: Math.round(correlation * 1000) / 1000,
  };
}

// Generate test data: stock with beta 0.5 relative to market
const marketReturns = [];
const stockReturns = [];
const marketReturn = 0.001;
const stockReturn = 0.5 * marketReturn; // beta 0.5

for (let i = 0; i < 250; i++) {
  marketReturns.push(marketReturn);
  stockReturns.push(stockReturn);
}

const result = linearRegression(marketReturns, stockReturns);
console.log('Regression result:', result);
console.log('Beta (slope):', result.slope);
console.log('Expected beta: 0.5');
