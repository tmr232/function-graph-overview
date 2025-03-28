/*
nodes: 7,
exits: 1
*/
void MultipleCatchClauses() {
    try
    {
        f();
    }
    catch (const std::overflow_error& e)
    {} // this executes if f() throws std::overflow_error (same type rule)
    catch (const std::runtime_error& e)
    {} // this executes if f() throws std::underflow_error (base class rule)
    catch (const std::exception& e)
    {} // this executes if f() throws std::logic_error (base class rule)
    catch (...)
    {} // this executes if f() throws std::string or int or any other unrelated type
}