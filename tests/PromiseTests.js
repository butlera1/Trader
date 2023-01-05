async function thisThrows() {
  throw new Error("Thrown from thisThrows()");
}

function rejects(){
  return new Promise((resolve, reject) => {
    reject("Failed via reject...");
  });
}

async function myFunctionThatCatches() {
  try {
    return await rejects(); // <-- Notice we added here the "await" keyword.
  } catch (e) {
    console.error(e);
  } finally {
    console.log('We do cleanup here');
  }
  return "Nothing found";
}

async function run() {
  const myValue = await myFunctionThatCatches();
  console.log(myValue);
}

run();