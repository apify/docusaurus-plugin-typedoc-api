/* eslint-disable react/jsx-filename-extension */
import { createContext } from "react";

export const ApiOptionsContext = createContext({
	hideInherited: false,
	setHideInherited: (hideInherited: boolean) => {},
});