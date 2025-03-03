"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function thunder(args) {
    if (args.default === undefined) {
        throw new Error('required `default` value for thunder!');
    }
    if (args.key === undefined) {
        throw new Error('required `key` value for thunder!');
    }
    if (args.encrypt === undefined) {
        throw new Error('required `encrypt` value for thunder!');
    }
    if (args.expire === undefined) {
        throw new Error('required `expire` value for thunder!');
    }
    if (args.expire !== null && typeof args.expire !== 'number') {
        throw new Error('`expire` is not a number or null for thunder!');
    }
    if (typeof args.key !== 'string') {
        throw new Error('`key` is not a string for thunder!');
    }
    if (args.key.length === 0) {
        throw new Error('`key` is an empty string for thunder!');
    }
    if (args.key.startsWith('thunder')) {
        throw new Error('`key` can not start with `thunder` for thunder!');
    }
    if (typeof args.encrypt !== 'boolean') {
        throw new Error('`encrypt` is not a boolean for thunder!');
    }
    if (args.reducers !== undefined &&
        (Object.keys(args.reducers).some((key) => typeof key !== 'string') ||
            Object.keys(args.reducers).some((key) => typeof args.reducers[key] !== 'function'))) {
        throw new Error('`reducers` is not an object with string keys and function values for thunder!');
    }
    if (args.selectors !== undefined &&
        (Object.keys(args.selectors).some((key) => typeof key !== 'string') ||
            Object.keys(args.selectors).some((key) => typeof args.selectors[key] !== 'function'))) {
        throw new Error('`selectors` is not an object with string keys and function values for thunder!');
    }
    const notDefinedThunderKey = Object.keys(args).filter((key) => ![
        'key',
        'encrypt',
        'default',
        'expire',
        'reducers',
        'selectors',
    ].includes(key));
    if (notDefinedThunderKey.length > 0) {
        throw new Error(`not defined key \`${notDefinedThunderKey.join(', ')}\` for thunder!`);
    }
    return args;
}
exports.default = thunder;
