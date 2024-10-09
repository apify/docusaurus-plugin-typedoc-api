export interface BarOptions {
    foo: string;
    bar: number;
    xyz: boolean;
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