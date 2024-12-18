
/*
unreach: [["SOURCE","UNREACH"]]
*/
func LabelledStatementFlow() {
  loop1: for x := range xs {
    for ;; {
      // CFG: SOURCE
      break loop1
    }
    // CFG: UNREACH
    unreachable_from_inner_loop()
  }
}
