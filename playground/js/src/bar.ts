export interface BarOptions {
	/**
	 * The name of the `Bar` instance.
	 *
	 * @default 'Karl'
	 */
	name: string;
	/**
	 * The age of the `Bar` instance.
	 *
	 * @default 0
	 */
	age: number;
	/**
	 * Favourite numbers of the `Bar` instance.
	 *
	 * @default [1, 2, Infinity]
	 */
	numbers: number[];
	/**
	 * Favourite words of the `Bar` instance.
	 *
	 * @default ['foo', 'bar', 'jabberwocky']
	 */
	strings: string[];
}

/**
 * This is a simple class called `Bar`
 */
export class Bar {
	private constructor(options: BarOptions) {
		// do nothing
	}

	/**
	 * Create a new instance of the `Bar` class.
	 *
	 * @param {BarOptions} options
	 * @returns {Bar}
	 */
	static create(options: BarOptions = {} as BarOptions): Bar {
		return new Bar(options);
	}
}
