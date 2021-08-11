// https://github.com/TypeStrong/typedoc-default-themes/blob/master/src/default/partials/comment.hbs

import React from 'react';
import { JSONOutput } from 'typedoc';
import { Markdown } from './Markdown';

export interface CommentProps {
	comment?: JSONOutput.Comment;
}

export function hasComment(comment?: JSONOutput.Comment): boolean {
	if (!comment) {
		return false;
	}

	return Boolean(comment.text || comment.shortText || (comment.tags && comment.tags?.length > 0));
}

export function Comment({ comment }: CommentProps) {
	if (!comment || !hasComment(comment)) {
		return null;
	}

	return (
		<div className="tsd-comment tsd-typography">
			{!!comment.shortText && (
				<div className="lead">
					<Markdown content={comment.shortText} />
				</div>
			)}

			{!!comment.text && <Markdown content={comment.text} />}

			{comment.tags && comment.tags.length > 0 && (
				<dl className="tsd-comment-tags">
					{comment.tags.map((tag) => (
						<React.Fragment key={tag.tag}>
							<dt>{tag.tag}</dt>
							<dd>
								<Markdown content={tag.text} />
							</dd>
						</React.Fragment>
					))}
				</dl>
			)}
		</div>
	);
}