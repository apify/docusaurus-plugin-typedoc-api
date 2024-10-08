/**
 * This is a simple class called Foo
 */
export class Foo {
    private name: string;
    /**
     * Constructor of the `Foo` class.
     */
    constructor() {
        this.name = 'Foo';
    }

    /**
     * Get the name of the class.
     * @returns {string}
     */
    getName(): string {
        return this.name;
    }

    /**
     * Set the name of the class.
     * @param {string} name
     */
    setName(name: string): void {
        this.name = name;
    }

    /**
     * A static method of the class.
     * 
     * @returns {string}
     * @static
     * @memberof Foo
     * @example
     * Foo.staticMethod();
     */
    static staticMethod(): string {
        return 'static method';
    }
}