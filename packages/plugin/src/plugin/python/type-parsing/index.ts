import childProcess from 'child_process';
import fs from 'fs';
import path from 'path';
import { DocspecType, TypeDocType } from '../types';

const RAW_TYPES_JSON_FILEPATH = path.join(__dirname, 'typedoc-types.raw');
const PARSED_TYPES_JSON_FILEPATH = path.join(__dirname, 'typedoc-types-parsed.raw');

const PYTHON_SCRIPT_FILEPATH = path.join(__dirname, 'parse_types.py');

/**
 * Keeps track of Typedoc type objects. When `resolveTypes` is called, it tries to parse
 * the Python types using Python's `ast` module. 
 * 
 * The parsed types are then applied to the original registered Typedoc type objects.
 */
export class PythonTypeResolver {
    private typedocTypes: TypeDocType[] = [];

    /**
     * Register a new Python type to be resolved.
     * 
     * Given a string representation of the type, returns a Typedoc type object.
     */
    registerType(docspecType: DocspecType): TypeDocType {
        const newType: TypeDocType = {
            name: docspecType?.replaceAll(/#.*/g, '').replaceAll('\n', '').trim() ?? docspecType,
            type: 'reference',
        };

        this.typedocTypes.push(newType);
        return newType;
    }

    /**
     * Parse the registered Python types using Python's ast module.
     * For the actual Python implementation, see `parse_types.py`.
     * 
     * Modifies the objects registered with `registerType` in-place.
     * 
     * @param typedocTypes The "opaque" Python types to parse.
     * @returns {void} Nothing. The registered types are mutated in-place.
     */
    resolveTypes() {
        fs.writeFileSync(
            RAW_TYPES_JSON_FILEPATH,
            JSON.stringify(
                this.typedocTypes
                    .filter(x => x.type === 'reference')
                    .map(x => x.name)
                    .filter(Boolean)
            )
        );
    
        childProcess.spawnSync('python', [PYTHON_SCRIPT_FILEPATH, RAW_TYPES_JSON_FILEPATH]);
    
        const parsedTypes = JSON.parse(
            fs.readFileSync(
                PARSED_TYPES_JSON_FILEPATH,
                'utf8'
            )
        ) as Record<string, TypeDocType>;
    
        for (const originalType of this.typedocTypes) {
            if (originalType.type === 'reference') {
                const parsedType = parsedTypes[originalType.name];
        
                if (parsedType) {
                    for (const key of Object.keys(parsedType)) {
                        originalType[key] = parsedType[key as keyof TypeDocType];
                    }
                }
            }
        }
    }

    /**
     * Strips the Optional[] type from the type string, 
     * and replaces generic types with just the main type.
     */
    getBaseType(type: string): string {
        return type?.replace(/Optional\[(.*)]/g, '$1').split('[')[0];
    }
}