
function start(item) {
  let cnt = 0;
  const duration = (item.name === 'item1') ? 1000 : 250;
  let handle = setInterval(() => {
    cnt++;
    if (item.name === 'item1') {
      console.log(`\t\t\t${item.name}: ${cnt} ${handle}`);
    } else {
      console.log(`${item.name}: ${cnt} ${handle}`);
    }
    if (cnt>4) clearInterval(handle);
  }, duration);
}

const item1 = { name: 'item1', handle: null};
const item2 = { name: 'item2', handle: null};

start(item1);
start(item2);
