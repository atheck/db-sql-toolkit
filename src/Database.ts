interface Database<TParams = unknown[]> {
	// biome-ignore lint/style/useNamingConvention: Constant
	MaxVariableNumber: number;
	executeSqlCommand: (statement: string, parameters: TParams) => Promise<void>;
	getRows: <TData>(statement: string, parameters: TParams) => Promise<TData[]>;
}

const countPropertyName = "COUNT(*)";

interface CountRow {
	[countPropertyName]: number;
}

export type { CountRow, Database };

export { countPropertyName };
