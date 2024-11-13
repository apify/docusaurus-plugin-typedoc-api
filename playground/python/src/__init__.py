from foo import Foo

@docs_group('Classes')
class Bar:
    """
    The bar class is a simple
    class that prints "Bar" when it is initialized and "foo" when the foo method is called.
    """

    foo = Foo()

    def __init__(self):
        """
        The constructor of the bar class.
        """
        print("Bar")

    def foo(self):
        """
        The foo method of the bar class, prints "foo".
        """
        print("foo")
