from foo import Foo

@docs_group('Classes')
class Bar:
    """
    The bar class is a simple
    class that prints "Bar" when it is initialized and "foo" when the foo method is called.
    """

    def __init__(self):
        """
        The constructor of the bar class.
        """
        print("Bar")

    def foo(self, count: int) -> Foo:
        """
        The foo method of the bar class, prints "foo".

        Args:
            count: The number of times to print "foo".
                This comment is multiline, and contains
                some urls too, look: https://apify.com
        """
        print("foo " * count)
    
    def foo2(self, count: int, second_arg: str) -> Foo:
        """
        The foo2 method of the bar class, prints "foo2".

        Args:
            count: The number of times to print "foo2".
                This comment is multiline, and contains some urls too,
                look: https://apify.com
            second_arg: The second argument. This shouldn't be a part of the previous argument's
                description: even with a colon.
        """
        print("foo2 " * count)

@docs_group('Classes')
class BarBar(Bar):
    """
    The BarBar class inherits from the Bar class and prints "BarBar" when it is initialized.
    """

    def __init__(self):
        """
        The constructor of the bar class.
        """
        print("BarBar")

@docs_group('Classes')
class BarBarBar(BarBar):
    """
    The BarBarBar class inherits from the BarBar class and prints "BarBarBar" when it is initialized.
    """

    def __init__(self):
        """
        The constructor of the bar class.
        """
        print("BarBarBar")

