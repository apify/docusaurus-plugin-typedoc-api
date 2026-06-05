/**
 * This is a simple class called Foo
 */
export class Foo {
	private name: string;
	/**
	 * This is the description of the Foo class.
	 *
	 * @since Added in 1.3.0
	 */
	public description: string;
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
	 *
	 * @since Added in 1.2.0
	 */
	setName(name: string | Foo): void {
		this.name = typeof name === 'string' ? name : name.getName();
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
