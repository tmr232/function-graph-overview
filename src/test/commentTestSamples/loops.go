/*
*/
func Loops() {
    for x := range xs { if(x) {break}}
    for i, x := range xs { if(x) {break}}
}

/*
*/
func cStyleForLoops() {
    for a:=1; b; c() { if (x) {break}}
    for a:=1; b;     { if (x) {break}}
    for a:=1;  ; c() { if (x) {break}}
    for a:=1;  ;     { if (x) {break}}
    for     ; b; c() { if (x) {break}}
    for     ; b;     { if (x) {break}}
    for     ;  ; c() { if (x) {break}}
    for     ;  ;     { if (x) {break}}
}
/**/
func allLoops() {
    for a:=1; b; c() { if (x) {break}}
    for a:=1; b;     { if (x) {break}}
    for a:=1;  ; c() { if (x) {break}}
    for a:=1;  ;     { if (x) {break}}
    for     ; b; c() { if (x) {break}}
    for     ; b;     { if (x) {break}}
    for     ;  ; c() { if (x) {break}}
    for     ;  ;     { if (x) {break}}
    for x := range y {if (x) {break}}
    for i, x := range y {if (x) {break}}
    for { if(x) {break}}
    for x == 1 {if(x) {break}}
    for f() {if(x) {break}}
    }

/*
exits: 0
*/
func infiniteLoop() {
    for {}
}

/*
exits: 1
*/
func condLoop() {
    for x == 1 {}
}

/*
exits: 1
*/
func cStyleLoop_ICU() {
    for i:=1; c; u() {}
}
/*
exits: 1
*/
func cStyleLoop_IC() {
    for i:=1; c;     {}
}
/*
exits: 0
*/
func cStyleLoop_IU() {
    for i:=1;  ; u() {}
}
/*
exits: 0
*/
func cStyleLoop_I() {
    for i:=1;  ;     {}
}
/*
exits: 1
*/
func cStyleLoop_CU() {
    for     ; c; u() {}
}
/*
exits: 1
*/
func cStyleLoop_C() {
    for     ; c;     {}
}
/*
exits: 0
*/
func cStyleLoop_U() {
    for     ;  ; u() {}
}
/*
exits: 0
*/
func cStyleLoop_() {
    for     ;  ;     {}
}