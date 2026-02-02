"""
Replaces the default pydoc-markdown shell script with a custom Python script calling the pydoc-markdown API directly.

This script generates an AST from the Python source code in the `src` directory and prints it as a JSON object.
"""

from pydoc_markdown.interfaces import Context
from pydoc_markdown.contrib.loaders.python import PythonLoader
from pydoc_markdown.contrib.processors.filter import FilterProcessor
from pydoc_markdown.contrib.processors.crossref import CrossrefProcessor
from google_docstring_processor import ApifyGoogleProcessor
from docspec import dump_module

import argparse

import json
import os

def search_for_git_root(path):
    if os.path.exists(os.path.join(path, '.git')):
        return path
    else:
        parent = os.path.dirname(path)
        if parent == path:
            return None
        return search_for_git_root(parent)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("-i", "--input", help = "Path to the Python module to generate the AST from.", required=True)
    parser.add_argument("output", help = "Path to store the generated AST as a JSON file in.")

    args = parser.parse_args()
    project_path = os.path.abspath(args.input)

    repo_root_path = search_for_git_root(project_path)
    if not repo_root_path:
        raise Exception("Could not find git root directory. Are you sure the Python module is in a git repository?")

    context = Context(directory='.')
    loader = PythonLoader(search_path=[project_path])
    filter = FilterProcessor(
        documented_only=False,
        skip_empty_modules=False,
    )
    crossref = CrossrefProcessor()
    google = ApifyGoogleProcessor()

    loader.init(context)
    filter.init(context)
    google.init(context)
    crossref.init(context)

    processors = [filter, google, crossref]

    dump = []

    modules = list(loader.load())

    for processor in processors:
        processor.process(modules, None)

    for module in modules:
        dump.append(dump_module(module))

    with open(args.output, 'w') as f:
        f.write(json.dumps(dump, indent=4).replace(
            repo_root_path,
            'REPO_ROOT_PLACEHOLDER'
        ))

if __name__ == "__main__":
    main()
