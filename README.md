# MSSQL Data Migration Tool

A Node.js-based solution for data migration between MSSQL databases.

## Key Features

- ✅ **MSSQL Data Migration**: High-performance batch processing
- ✅ **XML/JSON Configuration Support**: Flexible configuration format selection
- ✅ **Column Overrides**: Modify/add column values during migration
- ✅ **Pre/Post Processing**: Execute SQL scripts before/after migration
- ✅ **Dynamic Variables**: Extract and utilize data at runtime
- ✅ **Transaction Support**: Ensure data consistency
- ✅ **Detailed Logging**: 5-level log system
- ✅ **DRY RUN Mode**: Simulation without actual changes
- ✅ **SELECT * Auto Processing**: Automatic IDENTITY column exclusion
- ✅ **Progress Tracking**: Real-time migration progress monitoring

## Quick Start

### 1. Installation
```bash
npm install
```

### 2. Database Connection Setup
Create `config/dbinfo.json` file:
```json
{
  "dbs": {
    "sourceDB": {
      "server": "source-server.com",
      "database": "source_db",
      "user": "username",
      "password": "password",
      "isWritable": false
    },
    "targetDB": {
      "server": "target-server.com",
      "database": "target_db", 
      "user": "username",
      "password": "password",
      "isWritable": true
    }
  }
}
```

### 3. Basic Execution
```bash
# Windows users (recommended)
migrate.bat

# Command line users
node src/migrate-cli.js migrate --query ./queries/migration-queries.xml
```

## Main Commands

| Command | Description |
|---------|-------------|
| `migrate.bat` | Interactive menu interface |
| `node src/migrate-cli.js validate` | Configuration validation |
| `node src/migrate-cli.js test` | Connection test |
| `node src/migrate-cli.js migrate --dry-run` | Simulation execution |
| `node src/migrate-cli.js list-dbs` | List databases |

## Configuration File Formats

### XML Format (Recommended)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<migration>
  <settings>
    <sourceDatabase>sourceDB</sourceDatabase>
    <targetDatabase>targetDB</targetDatabase>
    <batchSize>1000</batchSize>
  </settings>
  
  <queries>
    <query id="migrate_users" targetTable="users" enabled="true">
      <sourceQuery>
        <![CDATA[SELECT * FROM users WHERE status = 'ACTIVE']]>
      </sourceQuery>
      
      <columnOverrides>
        <override column="migration_flag">1</override>
        <override column="updated_by">MIGRATION_TOOL</override>
        <override column="processed_at">${CURRENT_TIMESTAMP}</override>
        <override column="migration_date">${CURRENT_DATE}</override>
      </columnOverrides>
    </query>
  </queries>
  
  <!-- Dynamic Variables -->
  <dynamicVariables>
    <dynamicVariable id="active_customers" description="Active customer list">
      <query>
        <![CDATA[SELECT CustomerID, CustomerName FROM Customers WHERE IsActive = 1]]>
      </query>
      <extractType>column_identified</extractType>
    </dynamicVariable>
  </dynamicVariables>
</migration>
```

### JSON Format
```json
{
  "databases": {
    "source": "sourceDB",
    "target": "targetDB"
  },
  "queries": [
    {
      "id": "migrate_users",
      "sourceQuery": "SELECT * FROM users WHERE status = 'ACTIVE'",
      "targetTable": "users",
      "enabled": true
    }
  ],
  "dynamicVariables": [
    {
      "id": "active_customers",
      "description": "Active customer list",
      "query": "SELECT CustomerID, CustomerName FROM Customers WHERE IsActive = 1",
      "extractType": "column_identified"
    }
  ]
}
```

## Dynamic Variables

The tool supports dynamic variables that can extract data at runtime and use it in queries:

### Variable Types

| Type | Description | Access Pattern | Default |
|------|-------------|----------------|---------|
| `column_identified` | Extract all columns as arrays keyed by column name | `${varName.columnName}` | ✅ Yes |
| `key_value_pairs` | Extract first two columns as key-value pairs | `${varName.key}` | No |

### Usage Examples

```xml
<!-- Using column_identified (default) -->
<dynamicVariable id="customer_data" description="Customer information">
  <query>SELECT CustomerID, CustomerName, Region FROM Customers</query>
  <!-- extractType omitted - defaults to column_identified -->
</dynamicVariable>

<!-- Using key_value_pairs -->
<dynamicVariable id="status_mapping" description="Status mapping">
  <query>SELECT StatusCode, StatusName FROM StatusCodes</query>
  <extractType>key_value_pairs</extractType>
</dynamicVariable>
```

```sql
-- In your migration queries
SELECT * FROM Orders 
WHERE CustomerID IN (${customer_data.CustomerID})
  AND Status IN (${status_mapping.StatusCode})
```

## Documentation

- 📖 **[User Manual](USER_MANUAL.md)**: Complete usage guide
- 📋 **[Installation Guide](INSTALLATION_GUIDE.md)**: Detailed installation instructions
- 🔄 **[Change Log](CHANGELOG.md)**: Version-specific changes
- 🏗️ **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)**: Technical implementation details

## Database Scripts

The project includes various database scripts:

- 📊 **[create-sample-tables.sql](resources/create-sample-tables.sql)**: Sample tables for testing
- 📝 **[create-example-table.sql](resources/create-example-table.sql)**: Example table with various data types
- 📋 **[insert-sample-data.sql](resources/insert-sample-data.sql)**: Sample data insertion

### Example Table Usage

To create an example table with various data types and constraints for migration testing:

```sql
-- Execute in SQL Server Management Studio
-- Or run from command line
sqlcmd -S your-server -d your-database -i resources/create-example-table.sql
```

This table includes:
- Various data types (string, numeric, date, boolean, JSON, binary)
- Computed columns (full_name, age_group)
- Check constraints (age, salary, email format, etc.)
- Performance optimization indexes
- Useful views and stored procedures
- Sample data in multiple languages

## 📈 Progress Management

Starting from v2.1, real-time progress tracking and monitoring features have been added:

```bash
# List progress
node src/progress-cli.js list

# Show specific migration details
node src/progress-cli.js show migration-2024-12-01-15-30-00

# Real-time monitoring
node src/progress-cli.js monitor migration-2024-12-01-15-30-00

# Resume information
node src/progress-cli.js resume migration-2024-12-01-15-30-00

# Restart interrupted migration
node src/migrate-cli.js resume migration-2024-12-01-15-30-00 --query ./queries/migration-queries.xml

# Overall summary
node src/progress-cli.js summary

# Clean up old files
node src/progress-cli.js cleanup 7
```

### Key Features
- ⚡ **Real-time Tracking**: Real-time migration progress monitoring
- 📊 **Performance Metrics**: Processing speed, estimated completion time
- 🔍 **Detailed Analysis**: Phase, query, and batch-level detailed information
- 🔄 **Interruption Recovery**: Resume interrupted migrations from the completed point
- 💾 **Permanent Storage**: Progress file for history management
- 🛠️ **CLI Tools**: Various query and management commands

## SELECT * Auto Processing

Added functionality to automatically exclude IDENTITY columns when using `SELECT *`:

### Feature Description
- **Auto Detection**: Automatically detects `SELECT * FROM table_name` patterns
- **IDENTITY Column Exclusion**: Automatically identifies and excludes IDENTITY columns from target tables
- **Automatic Column List Generation**: Automatically sets `targetColumns`
- **Source Query Transformation**: Converts `SELECT *` to explicit column lists

### Usage Example
```xml
<query id="migrate_users" targetTable="users" enabled="true">
  <sourceQuery>
    <![CDATA[SELECT * FROM users WHERE status = 'ACTIVE']]>
  </sourceQuery>
  <!-- targetColumns is automatically set (IDENTITY columns excluded) -->
</query>
```

### Processing Steps
1. Detect `SELECT *` pattern
2. Query all columns from target table
3. Identify and exclude IDENTITY columns
4. Automatically set `targetColumns`
5. Transform source query to explicit column list

### Log Example
```
SELECT * detected. Automatically retrieving column information for table users.
IDENTITY column auto-excluded: id
Auto-set column list (15 columns, IDENTITY excluded): name, email, status, created_date, ...
Modified source query: SELECT name, email, status, created_date, ... FROM users WHERE status = 'ACTIVE'
```

## Testing

The project includes batch files for testing various features:

```bash
test-xml-migration.bat      # XML configuration test
test-dry-run.bat           # DRY RUN mode test
test-dbid-migration.bat    # DB ID reference test
test-log-levels.bat        # Log level test
test-select-star-identity.bat  # SELECT * IDENTITY exclusion test
test-dynamic-variables.js  # Dynamic variables test
```

## Contributing

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

## Support

- 💬 **Issue Reports**: [GitHub Issues](https://github.com/mrjung72/sql2db-nodejs/issues)
- 📚 **Documentation**: Refer to documents in project root
- 🔧 **Bug Fixes**: Contribute via Pull Request

## License

MIT License

Copyright (c) 2024 MSSQL Data Migration Tool

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

- Contact: sql2db.nodejs@gmail.com
- Website: sql2db.com
