class FooFooArguments:
    test: str
    """This is test, it is a string."""
    test2: int
    """This is test2, it is an integer."""

Capitalization: TypeAlias = Literal[
    'lowercase',
    'UPPERCASE',
]

@docs_group('Classes')
class Foo(BarBarBar, Generic[T]):
    """
    The foo class is a simple class that prints "Foo" when it is initialized and "bar" when the bar method is called.
    """

    def __init__(self, params: int, **kwargs: Unpack[FooFooArguments[GenericParameter]]):
        """
        The constructor of the foo class.
        """
        print("Foo")

    def bar(self, caps: Capitalization | None):
        """
        The bar method of the foo class, prints "bar".
        """
        print("bar")

    def bar_param(self, params: int, **kwargs: Unpack[FooFooArguments[GenericParameter]]):
        """
        The bar method of the foo class, prints "bar" and the given parameter.

        There are more-than-1-byte characters here, look: žžžžžžž!
        """

        print("bar", param)

    @overload
    def foo(self, param: str):
        print("foo")
    
    @overload
    def foo(self, param: str, param2: int):
        """
        Other signature of the foo method. Note that unlike in the first signature, the second parameter is required here

        Args:
            param: This is the first parameter of the overloaded foo method.
            param2: This is the second parameter of the overloaded foo method.
        """
        print("foo")
    
    def foo(self, param: str, param2: int = 0):
        """This is the foo method of the Foo class.
        
        Args:
            param: This is the first parameter of the foo method.
            param2: This is the second parameter of the foo method.
            **kwargs: This is a dictionary of additional arguments.
        """
        print("foo")
