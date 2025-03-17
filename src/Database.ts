import type { DefaultParamType } from "./sql";

interface Database<TParam = DefaultParamType> {
	// biome-ignore lint/style/useNamingConvention: Constant
	MaxVariableNumber: number;
	executeSqlCommand: (statement: string, parameters: TParam[]) => Promise<void>;
	getRows: <TData>(statement: string, parameters: TParam[]) => Promise<TData[]>;
}

const countPropertyName = "COUNT(*)";

interface CountRow {
	[countPropertyName]: number;
}

export type { CountRow, Database };

export { countPropertyName };
