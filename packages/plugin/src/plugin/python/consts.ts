import path from 'path';

export const REPO_ROOT_PLACEHOLDER = 'REPO_ROOT_PLACEHOLDER';

export const APIFY_CLIENT_REPO_URL = 'https://github.com/apify/apify-client-python';
export const APIFY_SDK_REPO_URL    = 'https://github.com/apify/apify-sdk-python';
export const APIFY_SHARED_REPO_URL = 'https://github.com/apify/apify-shared-python';
export const CRAWLEE_PYTHON_REPO_URL = 'https://github.com/apify/crawlee-python';

export const REPO_URL_PER_PACKAGE = {
    'apify': APIFY_SDK_REPO_URL,
    'apify_client': APIFY_CLIENT_REPO_URL,
    'apify_shared': APIFY_SHARED_REPO_URL,
    'crawlee': CRAWLEE_PYTHON_REPO_URL,
};

export const PYDOC_MARKDOWN_JSON_FILEPATH = path.join(__dirname, 'docspec-dump.jsonl');
export const PARSED_TYPEDOC_JSON_FILEPATH = path.join(__dirname, 'api-typedoc-generated.json');

// Taken from https://github.com/TypeStrong/typedoc/blob/v0.23.24/src/lib/models/reflections/kind.ts, modified
export const TYPEDOC_KINDS = {
    'class': {
        kind: 128,
        kindString: 'Class',
    },
    'data': {
        kind: 1024,
        kindString: 'Property',
    },
    'enum': {
        kind: 8,
        kindString: 'Enumeration',
    },
    'enumValue': {
        kind: 16,
        kindString: 'Enumeration Member',
    },
    'function': {
        kind: 2048,
        kindString: 'Method',
    },
}

export const GROUP_ORDER = [
    'Classes',
    'Abstract classes',
    'Data structures',
    'Errors',
    'Functions',
    'Constructors',
    'Methods',
    'Properties',
    'Constants',
    'Enumeration Members'
];