# MSSQL Data Migration Tool User Manual

## 📖 Table of Contents
- [Overview](#overview)
- [Installation and Setup](#installation-and-setup)
- [Basic Usage](#basic-usage)
- [XML Structure Description](#xml-structure-description)
- [Advanced Features](#advanced-features)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The MSSQL Data Migration Tool is a Node.js-based tool for efficiently performing data migration between Microsoft SQL Server databases.

### Key Features
- 🔄 **Batch Data Migration**: Optimized for large-scale data processing
- 🎛️ **Flexible Configuration**: XML or JSON-based configuration
- 🔧 **Column Overrides**: Modify/add specific column values during migration
- ⚙️ **Pre/Post Processing**: Execute SQL scripts before/after migration
- 📊 **Dynamic Variables**: Extract and utilize data at runtime
- 🚦 **Transaction Support**: Ensure data consistency
- 📋 **Detailed Logging**: Track and debug migration processes
- 📈 **Real-time Progress Management**: Track and monitor job progress
- 🔄 **Interruption Recovery**: Resume interrupted migrations from the completed point
- 🔍 **Current Time Functions**: Support for various timestamp formats
- 🖥️ **Real-time Monitoring**: Keyboard interactive monitoring and charts
- ⭐ **SELECT * Auto Expansion**: Automatic column expansion in pre/post-processing scripts
- 🎨 **Pre/Post-processing Column Overrides**: Automatic column addition to INSERT/UPDATE statements
- 📝 **Advanced SQL Parsing**: Comment processing and complex SQL syntax support

## 🛠️ Installation and Setup

### 1. System Requirements
- Node.js 14.0 or higher
- SQL Server 2012 or higher (source/target)
- Appropriate database permissions

### 2. Installation
```bash
npm install
```

### 3. Database Connection Setup
Create `config/dbinfo.json` file:
```json
{
  "dbs": {
    "sourceDB": {
      "server": "source-server.com",
      "port": 1433,
      "database": "source_database",
      "user": "username",
      "password": "password",
      "isWritable": false,
      "description": "Source database",
      "options": {
        "encrypt": true,
        "trustServerCertificate": true
      }
    },
    "targetDB": {
      "server": "target-server.com", 
      "port": 1433,
      "database": "target_database",
      "user": "username",
      "password": "password",
      "isWritable": true,
      "description": "Target database"
    }
  }
}
```

## 🚀 Basic Usage

### 1. Commands

#### Configuration Validation
```bash
node src/migrate-cli.js validate --query ./queries/migration-queries.xml
```

#### List Databases
```bash
node src/migrate-cli.js list-dbs
```

#### Execute Data Migration
```bash
node src/migrate-cli.js migrate --query ./queries/migration-queries.xml
```

#### Simulation Execution (DRY RUN)
```bash
node src/migrate-cli.js migrate --query ./queries/migration-queries.xml --dry-run
```

#### Resume Interrupted Migration
```bash
node src/migrate-cli.js resume migration-2024-12-01-15-30-00 --query ./queries/migration-queries.xml
```

### 2. Windows Batch File Usage
```bash
# Interactive menu interface
migrate.bat

# English version
migrate-english.bat
```

## 📋 XML Structure Description

### Basic Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<migration>
  <settings>
    <sourceDatabase>sourceDB</sourceDatabase>
    <targetDatabase>targetDB</targetDatabase>
    <batchSize>1000</batchSize>
    <logLevel>INFO</logLevel>
  </settings>
  
  <queries>
    <!-- Migration queries -->
  </queries>
  
  <dynamicVariables>
    <!-- Dynamic variables -->
  </dynamicVariables>
</migration>
```

### Settings Section
- **sourceDatabase**: Source database identifier from dbinfo.json
- **targetDatabase**: Target database identifier from dbinfo.json
- **batchSize**: Number of records processed per batch (default: 1000)
- **logLevel**: Logging level (DEBUG, INFO, WARN, ERROR, FATAL)

### Query Structure
```xml
<query id="unique_id" targetTable="table_name" enabled="true">
  <sourceQuery>
    <![CDATA[SELECT * FROM source_table WHERE condition]]>
  </sourceQuery>
  
  <columnOverrides>
    <override column="column_name">value</override>
    <override column="timestamp_column">${CURRENT_TIMESTAMP}</override>
  </columnOverrides>
  
  <preProcess description="Backup">
    <![CDATA[INSERT INTO backup_table SELECT * FROM target_table;]]>
  </preProcess>
  
  <postProcess description="Logging">
    <![CDATA[INSERT INTO migration_log VALUES ('table_name', GETDATE());]]>
  </postProcess>
</query>
```

## 🔄 Dynamic Variables System

The tool supports dynamic variables that can extract data at runtime and use it in queries.

### Variable Types

| Type | Description | Access Pattern | Default |
|------|-------------|----------------|---------|
| `column_identified` | Extract all columns as arrays keyed by column name | `${varName.columnName}` | ✅ Yes |
| `key_value_pairs` | Extract first two columns as key-value pairs | `${varName.key}` | No |

### Usage Examples

#### XML Configuration
```xml
<dynamicVariables>
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
</dynamicVariables>
```

#### Usage in Queries
```sql
-- In your migration queries
SELECT * FROM Orders 
WHERE CustomerID IN (${customer_data.CustomerID})
  AND Status IN (${status_mapping.StatusCode})
```

### Variable Processing
1. **Execution Order**: Dynamic variables are processed before migration queries
2. **Database Connection**: Uses the source database connection
3. **Error Handling**: If a variable query fails, it's replaced with an empty result
4. **Performance**: Variables are executed once and cached for the entire migration

## 🎨 Advanced Features

### 1. Column Overrides
```xml
<columnOverrides>
  <override column="migration_flag">1</override>
  <override column="updated_by">MIGRATION_TOOL</override>
  <override column="processed_at">${CURRENT_TIMESTAMP}</override>
  <override column="migration_date">${CURRENT_DATE}</override>
</columnOverrides>
```

### 2. Global Column Overrides
```xml
<globalColumnOverrides>
  <override column="created_by">SYSTEM</override>
  <override column="created_date">${CURRENT_TIMESTAMP}</override>
</globalColumnOverrides>
```

### 3. Pre/Post Processing
```xml
<preProcess description="Backup and cleanup">
  <![CDATA[
    -- Backup existing data
    INSERT INTO backup_table SELECT * FROM target_table;
    
    -- Clean up old data
    DELETE FROM target_table WHERE created_date < DATEADD(day, -30, GETDATE());
  ]]>
</preProcess>

<postProcess description="Validation and logging">
  <![CDATA[
    -- Validate migration
    IF (SELECT COUNT(*) FROM target_table) = 0
    BEGIN
      RAISERROR('Migration failed: No data found', 16, 1);
    END
    
    -- Log completion
    INSERT INTO migration_log (table_name, migrated_count, completed_at)
    SELECT 'target_table', COUNT(*), GETDATE() FROM target_table;
  ]]>
</postProcess>
```

### 4. Progress Tracking
```bash
# List all migrations
node src/progress-cli.js list

# Show specific migration details
node src/progress-cli.js show migration-2024-12-01-15-30-00

# Real-time monitoring
node src/progress-cli.js monitor migration-2024-12-01-15-30-00

# Resume information
node src/progress-cli.js resume migration-2024-12-01-15-30-00
```

### 5. SELECT * Auto Processing
When using `SELECT *`, the tool automatically:
- Detects the pattern
- Queries target table columns
- Excludes IDENTITY columns
- Transforms to explicit column list

```xml
<query id="migrate_users" targetTable="users" enabled="true">
  <sourceQuery>
    <![CDATA[SELECT * FROM users WHERE status = 'ACTIVE']]>
  </sourceQuery>
  <!-- targetColumns automatically set (IDENTITY columns excluded) -->
</query>
```

## 📝 Examples

### Complete Migration Example
```xml
<?xml version="1.0" encoding="UTF-8"?>
<migration>
  <settings>
    <sourceDatabase>sourceDB</sourceDatabase>
    <targetDatabase>targetDB</targetDatabase>
    <batchSize>500</batchSize>
    <logLevel>INFO</logLevel>
  </settings>
  
  <globalColumnOverrides>
    <override column="migration_source">LEGACY_SYSTEM</override>
    <override column="migration_date">${CURRENT_DATE}</override>
  </globalColumnOverrides>
  
  <dynamicVariables>
    <dynamicVariable id="active_customers" description="Active customer list">
      <query>SELECT CustomerID FROM Customers WHERE IsActive = 1</query>
    </dynamicVariable>
  </dynamicVariables>
  
  <queries>
    <query id="migrate_customers" targetTable="customers" enabled="true">
      <sourceQuery>
        <![CDATA[
          SELECT CustomerID, CustomerName, Email, Phone
          FROM customers_source 
          WHERE CustomerID IN (${active_customers.CustomerID})
        ]]>
      </sourceQuery>
      
      <columnOverrides>
        <override column="status">ACTIVE</override>
        <override column="created_by">MIGRATION_TOOL</override>
      </columnOverrides>
      
      <preProcess description="Backup existing customers">
        <![CDATA[
          INSERT INTO customers_backup 
          SELECT * FROM customers WHERE migration_source = 'LEGACY_SYSTEM';
        ]]>
      </preProcess>
      
      <postProcess description="Log migration completion">
        <![CDATA[
          INSERT INTO migration_log (table_name, record_count, completed_at)
          SELECT 'customers', COUNT(*), GETDATE() FROM customers;
        ]]>
      </postProcess>
    </query>
  </queries>
</migration>
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Connection Errors
**Problem**: Cannot connect to database
**Solution**: 
- Check `config/dbinfo.json` configuration
- Verify network connectivity
- Ensure proper database permissions

#### 2. Column Mismatch Errors
**Problem**: Source and target table column count mismatch
**Solution**:
- Use explicit column lists in sourceQuery
- Check column data types
- Use column overrides for missing columns

#### 3. Dynamic Variable Errors
**Problem**: Dynamic variable not resolving
**Solution**:
- Check variable query syntax
- Verify variable name in usage
- Check database permissions for variable queries

#### 4. Performance Issues
**Problem**: Slow migration performance
**Solution**:
- Reduce batch size
- Add appropriate indexes
- Use pre-processing to disable constraints

### Log Levels
- **DEBUG**: Detailed debugging information
- **INFO**: General information about migration progress
- **WARN**: Warning messages (non-critical issues)
- **ERROR**: Error messages (migration may continue)
- **FATAL**: Critical errors (migration stops)

### Error Recovery
1. **Check logs**: Review log files for error details
2. **Validate configuration**: Use `validate` command
3. **Test connections**: Use `list-dbs` command
4. **Resume migration**: Use `resume` command for interrupted migrations

## 📞 Support

- **Documentation**: Refer to project documentation
- **Issues**: Report issues via GitHub
- **Email**: sql2db.nodejs@gmail.com
- **Website**: sql2db.com

---

**Version**: v2.6 | **Last Updated**: 2024-08-14
