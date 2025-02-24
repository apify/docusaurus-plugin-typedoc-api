class FooFooArguments:
    test: str
    """This is test, it is a string."""
    test2: int
    """This is test2, it is an integer."""


class RandomKwargs(TypedDict):
    """Keyword arguments for dataset's `export_data_csv` method."""

    quoting: NotRequired[int]
    """Controls when quotes should be generated by the writer and recognized by the reader. Can take any of
    the `QUOTE_*` constants, with a default of `QUOTE_MINIMAL`."""

    skipinitialspace: NotRequired[bool]
    """When True, spaces immediately following the delimiter are ignored. Defaults to False."""

    strict: NotRequired[bool]
    """When True, raises an exception on bad CSV input. Defaults to False."""

Capitalization: TypeAlias = Literal[
    'lowercase',
    'UPPERCASE',
]

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

    def bar(self, caps: Capitalization):
        """
        The bar method of the foo class, prints "bar".
        """
        print("bar")

    def bar_param(self, params: int, **kwargs: Unpack[RandomKwargs]):
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
