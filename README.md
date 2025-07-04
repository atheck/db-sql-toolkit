# db-sql-toolkit

Helps with SQL statements, database migration, and bulk execution.

## Installation

`npm install db-sql-toolkit`

## Usage

### sql

The `sql` function is a tagged template function to write SQL statements and include parameters in the correct places.

```js
const id = "1234";
const statement = sql`
    SELECT
        name
        , version
        , author
    FROM package
    WHERE
        id = ${id}
`;
```

The `sql` function returns a tuple consisting of the statement and an array of passed parameters. In the returned statement all parameters are replaced by question marks (?).

**Hint:** You can get syntax highlighting in VS Code by installing an extension: [es6-string-html](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html)

#### Nesting

You can nest `sql` statements:

```js
const where = sql`
    id = ${1234}
`;
const statement = sql`
    SELECT
        name
        , version
        , author
    FROM package
    WHERE
        ${where}
`;
```

### SQL literals

If you want to use variables as SQL literals (where no variables are supported), you can use the `sqlLiteral` function:

```js
const concatCharacter = "|";
const statement = sql`
    SELECT
        GROUP_CONCAT(name, '${sqlLiteral(concatCharacter)}') AS package_names
    FROM package
    GROUP BY author
`;
```

This inserts the variable `concatCharacter` as a literal into the SQL statement.

### bulkInsertEntities

Insert many entities in as few operations as possible.

```ts
const packages: Package[] = [
    // a lot of packages
]

const getParameters = (package: Package): unknown[] => [
    package.id,
    package.name,
    package.version,
    package.author,
];
const statement = sql`
    INSERT INTO package (
        id
        , name
        , version
        , author
    )
    VALUES (${getParameters})
`;

await bulkInsertEntities(database, packages, statement);
```

This function (and all bulk* functions) uses the `MaxVariableNumber` property of the [Database](#database) and splits the operation into multiple operations, if required.

**Important:** To use this function you have to pass the function to get the parameters for one entity as the only parameter into the `sql` function.

### bulkExecuteCommand

Executes a SQL statement in as few operations as possible.

**Important:** To use this function one parameter of the `sql` function has to be an array.

**Warning:** Do not use the `NOT IN` operator. If you do so and the operation cannot be executed in one run, you get wrong results.

### bulkGetRows

Selects entities in as few operations as possible.

### bulkGetCount

Gets the total number of entities in as few operations as possible. You have to select `COUNT(*)` in the SQL statement.

### applyMigrations

With the help of the `applyMigrations` function you can execute database upgrades. It executes the required migrations in the given order.

```ts
import { applyMigrations, Database } from "db-sql-toolkit";

async function upgradeDatabase(database: Database): Promise<void> {
    await applyMigrations({
        database,
        migrations: [
            { id: "initial", apply: createDatabase },
            { id: "add-feature", apply: applyAddFeature },
            { id: "some-bugfix", apply: applySomeBugfix },
        ]
    });
}

async function createDatabase(database: Database): Promise<void> {
    // Create the initial database.
}
```

The `apply` function is called for each migration. The order of the migrations is important. The function `createDatabase` will be called first, then `applyAddFeature`, and finally `applySomeBugfix`.

The `id` of the migration is used to check if the migration was already executed. If it was, the `apply` function will not be called again.

The `id` of the migration can be any string. It is recommended to use a unique ID for each migration, e.g. a timestamp or a version number.

Optionally you can pass a `targetId` parameter to the `applyMigrations` function. This will stop the execution of the migrations if the target ID is reached. If you omit this parameter, all migrations will be executed.

```ts
import { applyMigrations, Database } from "db-sql-toolkit";

async function upgradeDatabase(database: Database): Promise<void> {
    await applyMigrations({
        database,
        targetId: "add-feature",
        migrations: [
            { id: "initial", apply: createDatabase },
            { id: "add-feature", apply: applyAddFeature },
            { id: "some-bugfix", apply: applySomeBugfix },
        ]
    });
}
```

Here, the migration will stop after the `add-feature` migration. The `apply` function of the `some-bugfix` migration will not be called. This may be useful for testing migrations.

See [Database](#database) for type information.

By default it uses the `_db_migration` table (and creates it if needed) to store and update the IDs of the executed migrations. You can change this by passing your own `getExecutedMigrationIds` and `insertMigrationId` functions to the `applyMigrations` function:

```ts
async function getExecutedMigrationIds(database: Database): Promise<string[]> {
    // Get the IDs of the executed migrations.

    return ["initial", "add-feature"];
}

async function insertMigrationId(database: Database, id: string): Promise<void> {
    // Insert the migration ID into the database.
}
```

Optionally you can pass a `writeLog` function to the `applyMigrations` function, e.g. to print the IDs of the executed migrations:

```ts
function writeLog(message: string): void {
    // Log the message.
}
```

### migrate

This is an alternative to the `applyMigrations` function. This function uses a `number` as the version of the database.

With the help of the `migrate` function you can execute database upgrades.

```ts
import { migrate, Database } from "db-sql-toolkit";

async function upgradeDatabase(database: Database): Promise<void> {
    await migrate({
        database,
        // The targetVersion parameter is optional. If you omit it, the migrationMap will be executed until the last version.
        targetVersion: 3,
        migrationMap: [
            [1, createDatabase],
            [2, updateToVersion2],
            [3, updateToVersion3],
        ]
    });
}

async function createDatabase(database: Database): Promise<void> {
    // Create the initial database.
}

// updateToVersion2 and updateToVersion3 are omitted.
```

See [Database](#database) for type information.

It calls all required upgrade functions in the correct order. In the example above, to upgrade the database from version 2 to 3, the function `updateToVersion3` will be called.

By default it uses the `db_version` table (and creates it if needed) to store and update the current version of the database. You can change this by passing your own `getCurrentVersion` and `updateVersion` functions to the `migrate` function:

```ts
async function getCurrentVersion(database: Database): Promise<number> {
    // Get the current version of the database.

    return 2;
}

async function updateVersion(database: Database, version: number): Promise<void> {
    // Write the new version into the database.
}
```

Optionally you can pass a `writeLog` function to the `migrate` function, e.g. to print the current and updated version of the database:

```ts
function writeLog(message: string): void {
    // Log the message.
}
```

## Types

### Database

The `Database` type is defined as an interface:

```ts
interface Database {
    MaxVariableNumber: number;
    executeSqlCommand: (statement: string, parameters: unknown[]) => Promise<void>;
    getRows: <T>(statement: string, parameters: unknown[]) => Promise<T[]>;
}
```

`MaxVariableNumber` is the maximum number of parameters per SQL statement.

### SQL Statement Parameters

The first type parameter of the `sql` function is a union type of all types that can be used as parameters in a SQL statement. To create a typed version of the `sql` function and all important types function, you can use the following type definitions:

```ts
import {
    type AllowedSqlParams,
    type BulkExecuteStatementParams as BulkExecuteStatementParamsOriginal,
    type BulkExecuteStatementSqlFnParams,
    type BulkStatementParams as BulkStatementParamsOriginal,
    type BulkStatementSqlFnParams,
    type Database as DatabaseOriginal,
    type SqlReturnType,
    type StatementParams as StatementParamsOriginal,
    type StatementSqlFnParams,
    sql as sqlOriginal,
} from "db-sql-toolkit";

// Your allowed parameter types.
type DatabaseParam = string | number | boolean | null | undefined;

interface Database extends DatabaseOriginal<DatabaseParam> {}

type StatementParams = StatementParamsOriginal<DatabaseParam>;
type BulkStatementParams<TData> = BulkStatementParamsOriginal<TData, DatabaseParam>;
type BulkExecuteStatementParams = BulkExecuteStatementParamsOriginal<DatabaseParam>;

function sql(strings: TemplateStringsArray, ...values: StatementSqlFnParams<DatabaseParam>): StatementParams;
function sql<TData>(strings: TemplateStringsArray, ...values: BulkStatementSqlFnParams<TData, DatabaseParam>): BulkStatementParams<TData>;
function sql(strings: TemplateStringsArray, ...values: BulkExecuteStatementSqlFnParams<DatabaseParam>): BulkExecuteStatementParams;

function sql<TData>(strings: TemplateStringsArray, ...values: AllowedSqlParams<TData, DatabaseParam>): SqlReturnType<TData, DatabaseParam> {
    return sqlOriginal<DatabaseParam>(strings, ...values);
}
```

The default type for the parameters is:

```ts
type DefaultParamType = string | number | boolean | null;
```
