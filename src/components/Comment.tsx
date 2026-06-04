// https://github.com/TypeStrong/typedoc-default-themes/blob/master/src/default/partials/comment.hbs
import { Fragment } from 'react';
import type { JSONOutput } from 'typedoc';
import { Markdown } from './Markdown';

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

const ADDED_IN_TAG = '@added_in';

function getAddedInVersion(comment: JSONOutput.Comment): string | null {
	const tag = comment.blockTags?.find((blockTag) => blockTag.tag === ADDED_IN_TAG);

	if (!tag) {
		return null;
	}

	return displayPartsToMarkdown(tag.content).trim() || null;
}

export function Comment({ comment, root, hideTags = [] }: CommentProps) {
	if (!comment || !hasComment(comment)) {
		return null;
	}

	// Hide custom tags.
	hideTags.push('@reference');

	const addedIn = getAddedInVersion(comment);

	const blockTags =
		comment.blockTags?.filter((tag) => {
			if (hideTags.includes(tag.tag)) {
				return false;
			}

			return tag.tag !== '@default' && tag.tag !== ADDED_IN_TAG;
		}) ?? [];

	return (
		<div className={`tsd-comment tsd-typography ${root ? 'tsd-comment-root' : ''}`}>
			{addedIn && (
				<span className="badge badge--secondary tsd-added-in">Added in: {addedIn}</span>
			)}

			{!!comment.summary && (
				<div className="lead">
					<Markdown content={displayPartsToMarkdown(comment.summary)} />
				</div>
			)}

			{blockTags.length > 0 && (
				<dl className="tsd-comment-tags">
					{blockTags.map((tag) => (
						<Fragment key={tag.tag}>
							<dt>
								<strong>{tag.tag}</strong>
							</dt>
							<dd>
								<Markdown content={displayPartsToMarkdown(tag.content)} />
							</dd>
						</Fragment>
					))}
				</dl>
			)}
		</div>
	);
}
