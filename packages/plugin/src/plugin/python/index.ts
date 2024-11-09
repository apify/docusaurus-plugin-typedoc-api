/* eslint-disable */

import { PARSED_TYPEDOC_JSON_FILEPATH, PYDOC_MARKDOWN_JSON_FILEPATH } from "./consts";
import { PythonTypeResolver } from "./type-parsing";
export { groupSort } from "./utils";

import fs  from 'fs';
import { spawnSync } from 'child_process';
import { transformObject } from "./transformation";

const moduleShortcuts = require('./module_shortcuts.json');
const path = require('path');

// For each package, get the installed version, and set the tag to the corresponding version
const TAG_PER_PACKAGE = {};
for (const pkg of ['apify', 'apify_client', 'apify_shared']) {
    const spawnResult = spawnSync('python', ['-c', `import ${pkg}; print(${pkg}.__version__)`]);
    if (spawnResult.status === 0) {
        TAG_PER_PACKAGE[pkg] = `v${spawnResult.stdout.toString().trim()}`;
    }
}

// For the current package, set the tag to 'master'
const thisPackagePyprojectToml = fs.readFileSync(path.join(__dirname, '..', '/pyproject.toml'), 'utf8');
const thisPackageName = thisPackagePyprojectToml.match(/^name = "(.+)"$/m)[1];
TAG_PER_PACKAGE[thisPackageName] = 'master';

const symbolIdMap = [];

// Recursively traverse a javascript POJO object, if it contains both 'name' and 'type : reference' keys, add the 'target' key
// with the corresponding id of the object with the same name

function fixRefs(obj, namesToIds) {
    for (const key in obj) {
        if (key === 'name' && obj?.type === 'reference' && namesToIds[obj?.name]) {
            obj.target = namesToIds[obj?.name];
        }
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            fixRefs(obj[key], namesToIds);
        }
    }
}

function main() {
    // Root object of the Typedoc structure
    const typedocApiReference = {
        id: 0,
        name: 'apify-client',
        kind: 1,
        kindString: 'Project',
        flags: {},
        originalName: '',
        children: [],
        groups: [],
        sources: [
            {
                fileName: 'src/index.ts',
                line: 1,
                character: 0,
                url: `http://example.com/blob/123456/src/dummy.py`,
            }
        ],
        symbolIdMap: {},
    };

    // Load the docspec dump file
    const thisPackageModules = JSON.parse(
        fs.readFileSync(PYDOC_MARKDOWN_JSON_FILEPATH, 'utf8')
    );

    const pythonTypeResolver = new PythonTypeResolver();

    // Convert all the modules, store them in the root object
    for (const module of thisPackageModules) {
        transformObject({
            currentDocspecNode: module, 
            parentTypeDoc: typedocApiReference, 
            rootModuleName: module.name,
            pythonTypeResolver,
        });
    };

    // Runs the Python AST parser on the collected types to get rich type information
    pythonTypeResolver.resolveTypes();

    // Recursively fix references (collect names->ids of all the named entities and then inject those in the reference objects)
    const namesToIds = {};
    function collectIds(obj) {
        for (const child of obj.children ?? []) {
            namesToIds[child.name] = child.id;
            collectIds(child);
        }
    }
    collectIds(typedocApiReference);
    fixRefs(typedocApiReference, namesToIds);

    // Sort the children of the root object
    sortChildren(typedocApiReference);

    typedocApiReference.symbolIdMap = Object.fromEntries(Object.entries(symbolIdMap));

    // Write the Typedoc structure to the output file
    fs.writeFileSync(PARSED_TYPEDOC_JSON_FILEPATH, JSON.stringify(typedocApiReference, null, 4));
}

if (require.main === module) {
    main();
}

module.exports = {
    groupSort,
}