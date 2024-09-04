package WhoCares

// func blocksToDot(function *ssa.Function) ([]byte, error) {
// 	functionGraph := simple.NewDirectedGraph()

// 	for _, block := range function.Blocks {
// 		functionGraph.AddNode(&Node{index: block.Index, function: function})
// 	}

// 	for _, block := range function.Blocks {
// 		for _, succ := range block.Succs {
// 			// gonum.graph.simple does not support self-links, so we hack around it...
// 			if block.Index == succ.Index {
// 				functionGraph.Node(int64(block.Index)).(*Node).hasSelfEdge = true
// 			} else {
// 				functionGraph.SetEdge(Edge{
// 					from:     block.Index,
// 					to:       succ.Index,
// 					function: function,
// 				})
// 			}
// 		}
// 	}

// 	dotGraph, err := dot.Marshal(functionGraph, function.Name(), "", "    ")
// 	dotGraph = bytes.Replace(dotGraph, []byte("\\n"), []byte("\\l"), -1)
// 	return dotGraph, err
// }

// func ifMerge() {
// 	if x {

// 	} else if y {
// 	} else {}
// }

// // File: demo/demo.go
// func Demo(flag bool, n int) {
// 	if flag {
// 		fmt.Println("Hello, World!")
// 	}
// 	fmt.Println("Oh no!")

// 	for _, x := range "Hello, World!" {
// 		fmt.Println(x)
// 	}

// 	if flag {
// 		fmt.Println("A")
// 	} else if n == 3 {
// 		fmt.Println("B")
// 	} else if n == 2 {
// 		fmt.Println("C")
// 	} else {
// 		fmt.Println("D")
// 	}

// 	switch n {
// 	case 1:
// 		return
// 	case 2:
// 		return
// 	case 3:
// 		return
// 	}
// 	fmt.Println("Yo")
// }

// func ret() {
// 	if a {
// 		return;
// 	}
// 	return;
// }

// func Switch() {
// 	switch n {
// 	case 1:
// 		x = 1
// 		y = 2
// 		return
// 	case 2:
// 		x = 2
// 	case 3:
// 		f()
// 	default:
// 		a = 1
// 	}
// 	return
// }

// func endlessLoop() {
// 	for {

// 	}
// }

// func endlessBreak() {
// 	for {
// 		break
// 	}
// }

// func endlessContinue() {
// 	for {
// 		continue
// 	}
// }

// func ifBreakContinue() {
// 	for {
// 		if x {
// 			break;
// 		} else {
// 			continue;
// 		}
// 	}
// }

func switchStatement() {
	switch x {
	case 1:
		break;
	case 2:
		print()
	case 3:
		return
	case 4:
		x = 1;
		break;
	default:
		print()
	}
}

// func hasGoto() {
// 	if x {
// 		goto myCoolLabel
// 	}
// 	return
// myCoolLabel:
// 	x = 2
// 	return
// }

// func typeSwitch() {
// 	switch val.(type) {
// 	case int:
// 		f();
// 	case float:
// 		f();
// 	default:
// 		f();
// 	}
// }

// func isCallTo(target callTarget, node ast.Node, typesInfo *types.Info) bool {
// 	_, isCall := node.(*ast.CallExpr)
// 	if !isCall {
// 		return false
// 	}

// 	for {
// 		switch current := node.(type) {
// 		case *ast.CallExpr:
// 			node = current.Fun
// 		case *ast.SelectorExpr:
// 			node = current.Sel
// 		case *ast.Ident:
// 			definition, exists := typesInfo.Uses[current]
// 			if !exists {
// 				return false
// 			}

// 			funcDef, isFunc := definition.(*types.Func)
// 			if !isFunc {
// 				return false
// 			}

// 			if funcDef.Pkg() == nil {
// 				return false
// 			}
// 			if funcDef.Pkg().Path() == target.PkgPath && funcDef.Name() == target.Name {
// 				return true
// 			}
// 			return false
// 		default:
// 			return false
// 		}
// 	}
// }

// func (bla bla) method() {
// 	return
// }


// var x = func() {return;}


// func hasSelect() {
// 	select {
// 	case c <- x:
// 		f()
// 	case <-quit:
// 		return
// 	}
// 	f()
// }