// https://github.com/TypeStrong/typedoc-default-themes/blob/master/src/default/partials/comment.hbs
import type { JSONOutput } from 'typedoc';
import { Markdown } from './Markdown';

// Human-friendly headings for the tags we render as their own section. Tags not
// listed fall back to their name with the leading `@` stripped and capitalised.
const TAG_LABELS: Record<string, string> = {
	'@deprecated': 'Deprecated',
	'@remarks': 'Remarks',
	'@returns': 'Returns',
	'@see': 'See',
	'@throws': 'Throws',
};

// Tags that carry meaning even without a user-supplied message get a sensible
// default so the section is never empty.
const TAG_DEFAULT_MESSAGES: Record<string, string> = {
	'@deprecated': 'This is deprecated and should not be used in new code.',
	'@see': 'See the related documentation.',
};

function getTagLabel(tag: string): string {
	if (TAG_LABELS[tag]) {
		return TAG_LABELS[tag];
	}

	const name = tag.replace(/^@/, '');

	return name.charAt(0).toUpperCase() + name.slice(1);
}

export interface CommentProps {
	comment?: JSONOutput.Comment;
	root?: boolean;
	hideTags?: string[];
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

export function Comment({ comment, root, hideTags = [] }: CommentProps) {
	if (!comment || !hasComment(comment)) {
		return null;
	}

	// Hide custom tags.
	hideTags.push('@reference', '@since', '@example');

	const blockTags =
		comment.blockTags?.filter((tag) => {
			if (hideTags.includes(tag.tag)) {
				return false;
			}

			return tag.tag !== '@default';
		}) ?? [];

	return (
		<div className={`tsd-comment tsd-typography ${root ? 'tsd-comment-root' : ''}`}>
			{!!comment.summary && (
				<div className="lead">
					<Markdown content={displayPartsToMarkdown(comment.summary)} />
				</div>
			)}

			{blockTags.map((tag) => {
				const content =
					displayPartsToMarkdown(tag.content).trim() || TAG_DEFAULT_MESSAGES[tag.tag] || '';

				return (
					<div key={`${tag.tag}-${content}`} className="tsd-comment-tag">
						<span className="tsd-comment-tag-label">{getTagLabel(tag.tag)}</span>
						<Markdown content={content} />
					</div>
				);
			})}
		</div>
	);
}
