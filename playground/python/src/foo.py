@docs_group('Classes')
class Foo:
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
