// https://github.com/TypeStrong/typedoc-default-themes/blob/master/src/default/partials/comment.hbs
import type { JSONOutput } from 'typedoc';
import { Markdown } from './Markdown';

// Tags that carry meaning even without a user-supplied message get a sensible
// default so the section is never empty.
const TAG_DEFAULT_MESSAGES: Record<string, string> = {
	'@deprecated': 'This API is deprecated and may be removed in a future version.',
	'@see': 'See the related documentation.',
};

const TAG_PREFIX: Record<string, string> = {
	'@deprecated': 'Deprecated - ',
};

const ALWAYS_HIDDEN = ['@reference', '@since', '@example'];

function filterBlockTags(
	blockTags: JSONOutput.CommentTag[],
	hideTags: string[],
): JSONOutput.CommentTag[] {
	const hidden = [...ALWAYS_HIDDEN, ...hideTags];

	return blockTags.filter((tag) => !hidden.includes(tag.tag) && tag.tag !== '@default');
}

export interface CommentProps {
	comment?: JSONOutput.Comment;
	root?: boolean;
	hideTags?: string[];
	noBlockTags?: boolean;
}

export function hasComment(comment?: JSONOutput.Comment): boolean {
	if (!comment) {
		return false;
	}

	return Boolean(
		comment.summary?.some((x) => x.kind !== 'text' || x.text !== '') ||
			(comment.blockTags && comment.blockTags?.length > 0),
	);
}

interface SinceReflection {
	comment?: JSONOutput.Comment;
	inheritedFrom?: JSONOutput.ReferenceType;
	sources?: JSONOutput.SourceReference[];
}

// Native runtime symbols: the TypeScript standard library (`lib.*.d.ts`) and
// Node's built-in type definitions (`@types/node`). These have no meaningful
// `@since` of their own — a `@since` on such a member would be copied noise — so
// we always drop it. Other dependencies under `node_modules` are NOT native:
// their `@since` tags (if any) reflect that package's real release history, so
// inherited members keep them.
const NATIVE_SOURCE = /(?:^|\/)node_modules\/(?:typescript\/lib\/|@types\/node\/)/;

function isNativeReflection(reflection: SinceReflection): boolean {
	const fileName = reflection.sources?.[0]?.fileName;

	return !!fileName && NATIVE_SOURCE.test(fileName);
}

// Return the content of an `@since` tag explicitly present on the reflection.
//
// TypeDoc copies a base member's doc comment onto the members that inherit it,
// so an inherited symbol naturally carries the `@since` it was given in its
// base — we keep that, mirroring how every other inherited doc behaves
// (including symbols inherited from other packages). The exception is members
// inherited from a native runtime type (e.g. `Error`): those carry no real
// version, so we drop it.
export function getSinceContent(
	reflection: SinceReflection | undefined,
): JSONOutput.CommentDisplayPart[] | undefined {
	const content = reflection?.comment?.blockTags?.find(
		(blockTag) => blockTag.tag === '@since',
	)?.content;

	if (!content) {
		return undefined;
	}

	if (reflection.inheritedFrom && isNativeReflection(reflection)) {
		return undefined;
	}

	return content;
}

export function displayPartsToMarkdown(parts: JSONOutput.CommentDisplayPart[]): string {
	return parts
		.map((part) => {
			if (part.kind === 'inline-tag') {
				return `{${part.tag} ${part.text}}`;
			}

			return part.text;
		})
		.join('');
}

function resolveTagContent(tag: JSONOutput.CommentTag): string {
	const raw = displayPartsToMarkdown(tag.content).trim();

	if (raw) {
		return TAG_PREFIX[tag.tag] ? `${TAG_PREFIX[tag.tag]}${raw}` : raw;
	}

	return TAG_DEFAULT_MESSAGES[tag.tag] || '';
}

export interface CommentTagsProps {
	comment?: JSONOutput.Comment;
	hideTags?: string[];
}

export function CommentTags({ comment, hideTags = [] }: CommentTagsProps) {
	const blockTags = filterBlockTags(comment?.blockTags ?? [], hideTags);

	return (
		<>
			{blockTags.map((tag) => {
				const content = resolveTagContent(tag);

				if (!content) return null;

				return (
					<div key={`${tag.tag}-${content}`} className="tsd-comment-since">
						<Markdown content={content} />
					</div>
				);
			})}
		</>
	);
}

export function Comment({ comment, root, hideTags = [], noBlockTags = false }: CommentProps) {
	if (!comment || !hasComment(comment)) {
		return null;
	}

	const blockTags = noBlockTags ? [] : filterBlockTags(comment.blockTags ?? [], hideTags);

	return (
		<div className={`tsd-comment tsd-typography ${root ? 'tsd-comment-root' : ''}`}>
			{!!comment.summary && (
				<div className="lead">
					<Markdown content={displayPartsToMarkdown(comment.summary)} />
				</div>
			)}

			{blockTags.map((tag) => {
				const content = resolveTagContent(tag);

				if (!content) return null;

				return (
					<div key={`${tag.tag}-${content}`} className="tsd-comment-since">
						<Markdown content={content} />
					</div>
				);
			})}
		</div>
	);
}
