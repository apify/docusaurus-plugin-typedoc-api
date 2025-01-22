class FooFooArguments:
    test: str
    """This is test, it is a string."""
    test2: int
    """This is test2, it is an integer."""

@docs_group('Classes')
class Foo(BarBarBar, Generic[T]):
    """
    The foo class is a simple class that prints "Foo" when it is initialized and "bar" when the bar method is called.
    """

    def __init__(self):
        """
        The constructor of the foo class.
        """
        print("Foo")

    def bar(self):
        """
        The bar method of the foo class, prints "bar".
        """
        print("bar")

    def bar_param(self, param):
        """
        The bar method of the foo class, prints "bar" and the given parameter.

        There are more-than-1-byte characters here, look: žžžžžžž!
        """

        print("bar", param)

    def foo(self, param: str, param2: int = 0, **kwargs: Unpack[FooFooArguments]):
        print("foo")
