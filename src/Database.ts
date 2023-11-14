interface Database {
	MaxVariableNumber: number;
	executeSqlCommand: (statement: string, parameters: unknown[]) => Promise<void>;
	getRows: <T>(statement: string, parameters: unknown[]) => Promise<T[]>;
}

const countPropertyName = "COUNT(*)";

interface CountRow {
	[countPropertyName]: number;
}

export type { CountRow, Database };

export { countPropertyName };
