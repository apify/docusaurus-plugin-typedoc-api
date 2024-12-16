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

    def foo(self) -> Foo:
        """
        The foo method of the bar class, prints "foo".
        """
        print("foo")

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

