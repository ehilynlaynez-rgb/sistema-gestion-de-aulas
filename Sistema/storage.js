// Manejo de LocalStorage
function getData(key){ return JSON.parse(localStorage.getItem(key)) || []; }
function setData(key, data){ localStorage.setItem(key, JSON.stringify(data)); }
