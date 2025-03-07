/*
nodes: 4,
exits: 1
 */
function throwAndFinally() {
  try {
    throw new Error()
  } finally {
    console.log("Oh no!")
  }
}