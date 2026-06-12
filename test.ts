fetch('https://query1.finance.yahoo.com/v1/finance/search?q=AAPL')
  .then(res => res.json())
  .then(r => console.log(Object.keys(r)))
  .catch(console.error);
