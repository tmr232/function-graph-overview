/*
exits: 1
 */
function tryCatch() {
  try {
    f();
  } catch {
    g();
  }
}

/*
exits: 1
 */
function tryFinaly() {
  try {
    f();
  } finally {
    g();
  }
}

/*
exits: 1
 */
function tryCatchFinally() {
  try {
    f();
  } catch {
    g();
  } finally {
    h();
  }
}