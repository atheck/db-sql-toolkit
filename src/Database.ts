interface Database {
	// biome-ignore lint/style/useNamingConvention: Constant
	MaxVariableNumber: number;
	executeSqlCommand: (statement: string, parameters: unknown[]) => Promise<void>;
	getRows: <TData>(statement: string, parameters: unknown[]) => Promise<TData[]>;
}

const countPropertyName = "COUNT(*)";

interface CountRow {
	[countPropertyName]: number;
}

export type { CountRow, Database };

export { countPropertyName };
