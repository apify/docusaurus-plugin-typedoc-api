/* eslint-disable no-nested-ternary */
// https://github.com/TypeStrong/typedoc-default-themes/blob/master/src/default/partials/member.signature.title.hbs

import React from 'react';
import { JSONOutput } from 'typedoc';
import { Type } from './Type';
import { TypeParametersGeneric } from './TypeParametersGeneric';

export interface MemberSignatureTitleProps {
	useArrow?: boolean;
	hideName?: boolean;
	sig: JSONOutput.SignatureReflection & { modifiers?: string[] };
}

export function MemberSignatureTitle({ useArrow, hideName, sig }: MemberSignatureTitleProps) {
	// add `*` before the first keyword-only parameter
	const parametersCopy = sig.parameters?.slice() ?? [];
	const firstKeywordOnlyIndex = parametersCopy.findIndex((param) => Object.keys(param.flags).includes('keyword-only'));
	if (firstKeywordOnlyIndex >= 0) {
		parametersCopy.splice(firstKeywordOnlyIndex, 0, {
			id: 999_999,
			name: '*',
			kind: 32_768,
			flags: { },
			permalink: '',
		});
	}

	return (
		<>
			{!hideName && sig.name !== '__type' ? (
				<span>{sig.modifiers ? `${sig.modifiers.join(' ')} ` : ''}<b>{sig.name}</b></span>
			) : sig.kindString === 'Constructor signature' ? (
				<>
					{sig.flags?.isAbstract && <span className="tsd-signature-symbol">abstract </span>}
					<span className="tsd-signature-symbol">new </span>
				</>
			) : null}

			<TypeParametersGeneric params={sig.typeParameter} />

			<span className="tsd-signature-symbol">(</span>

			{parametersCopy.map((param, index) => (
				<React.Fragment key={param.id}>
					{index > 0 && <span className="tsd-signature-symbol">, </span>}

					<span>
						{param.flags?.isRest && <span className="tsd-signature-symbol">...</span>}
						{param.name}
					</span>
				</React.Fragment>
			))}

			<span className="tsd-signature-symbol">)</span>

			{sig.type && (
				<>
					<span className="tsd-signature-symbol">{useArrow ? ' => ' : ': '}</span>
					<Type type={sig.type} />
				</>
			)}
		</>
	);
}
