/*
nodes: 1
*/
void trivial()
{
}

/*
nodes: 3
*/
void simpleIf()
{
    if (x)
    {
    }
}

/*
nodes: 6,
exits: 1
*/
void ifElse()
{
    if (x)
    {
    }
    else if (y)
    {
    }
    else
    {
    }
}
