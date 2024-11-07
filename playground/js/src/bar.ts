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