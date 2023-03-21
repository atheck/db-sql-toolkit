interface Database {
	MaxVariableNumber: number;
	executeSqlCommand: (statement: string, parameters: unknown[]) => Promise<void>;
	getRows: <T>(statement: string, parameters: unknown[]) => Promise<T[]>;
}

export type { Database };
