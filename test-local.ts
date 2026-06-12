fetch('http://localhost:3000/api/market/stocks').then(r=>r.text()).then(t=>console.log(t.substring(0,200))).catch(e=>console.error(e));
