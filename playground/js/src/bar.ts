/**
 * @since Added in 1.2.0
 */
export interface BarOptions<NameType extends string> {
	/**
	 * The name of the `Bar` instance.
	 *
	 * @default 'Karl'
	 * @since Added in 1.0.0
	 */
	name: NameType;
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
 *
 * @since Added in 1.1.0-beta.23
 */
export class Bar {
	private constructor() {
		// do nothing
	}

	/**
	 * Create a new instance of the `Bar` class.
	 *
	 * @param {BarOptions} options
	 * @returns {Bar}
	 * @since Added in 1.0.0, 1.1.0-beta.23
	 */
	static create<TypeParamName extends string = 'Karl'>(options: BarOptions<TypeParamName> = {} as BarOptions<TypeParamName>): Bar {
		return new Bar();
	}
}
