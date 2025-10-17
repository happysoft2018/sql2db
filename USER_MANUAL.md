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
- 🎛️ **Flexible Configuration**: XML-based configuration
- 🔧 **Column Overrides**: Modify/add specific column values during migration
- ⚙️ **Pre/Post Processing**: Execute SQL scripts before/after migration
- 📊 **Dynamic Variables**: Extract and utilize data at runtime
- 🗄️ **Multi-DB Dynamic Variables**: Extract dynamic variables from all databases defined in dbinfo.json
- 🚦 **Transaction Support**: Ensure data consistency
- 📋 **Detailed Logging**: Track and debug migration processes with password masking
- 📈 **Real-time Progress Management**: Track and monitor job progress
- 🔄 **Interruption Recovery**: Resume interrupted migrations from the completed point
- 🔍 **Current Time Functions**: Support for various timestamp formats
- 🖥️ **Real-time Monitoring**: Keyboard interactive monitoring and charts
- ⭐ **SELECT * Auto Expansion**: Automatic column expansion in pre/post-processing scripts
- 🎨 **Pre/Post-processing Column Overrides**: Automatic column addition to INSERT/UPDATE statements
- 📝 **Advanced SQL Parsing**: Comment processing and complex SQL syntax support
- 🆕 **Case-Insensitive Column Matching**: Automatically matches column names regardless of case
- 🆕 **Large Dataset Support**: Handles SQL Server 2100 parameter limit automatically
- 🆕 **Enhanced Debugging**: Detailed diagnostics for troubleshooting delete operations

## 🛠️ Installation and Setup

### 1. System Requirements

#### For Standalone Executable Users
- Windows 7 or higher (64-bit)
- SQL Server 2012 or higher (source/target)
- Appropriate database permissions
- **No Node.js installation required**

#### For Node.js Source Users
- Windows 7 or higher (64-bit)
- **Node.js 14.0 or higher** (18.x recommended)
- npm 6.0 or higher
- SQL Server 2012 or higher (source/target)
- Appropriate database permissions

### 2. Installation

#### Option 1: Standalone Executable (For End Users)

**Best for:**
- Users who want quick setup without Node.js
- Production environments
- Users unfamiliar with Node.js

**Installation Steps:**
1. Download `sql2db-v0.8.1-bin.zip` from the release page
2. Extract to your desired location (e.g., `C:\Tools\sql2db\`)
3. No additional installation required - ready to use!

**Package Contents:**
```
sql2db-v0.8.1/
├── sql2db.exe              # Main executable (no Node.js needed)
├── run.bat                 # English launcher
├── 실행하기.bat             # Korean launcher
├── config/
│   └── dbinfo.json         # Database configuration
├── queries/                # Query definition files
│   └── (your XML files)
├── resources/              # SQL resource files
│   ├── create_sample_tables.sql
│   └── insert_sample_data.sql
├── user_manual/            # Complete documentation
│   ├── USER_MANUAL.md
│   ├── USER_MANUAL_KR.md
│   ├── CHANGELOG.md
│   └── CHANGELOG_KR.md
├── logs/                   # Log output directory (auto-created)
└── results/                # Migration results (auto-created)
```

**Advantages:**
- ✅ No Node.js installation required
- ✅ Single executable file
- ✅ Fast startup
- ✅ ~50MB complete package with all dependencies
- ✅ Easy distribution

#### Option 2: Node.js Source Version (For Developers)

**Best for:**
- Developers who need to modify the source code
- CI/CD pipelines
- Custom integrations
- Development and testing

**Installation Steps:**

1. **Install Node.js**
   ```bash
   # Download from https://nodejs.org/
   # Verify installation
   node --version  # Should show v14.0 or higher
   npm --version   # Should show v6.0 or higher
   ```

2. **Get Source Code**
   ```bash
   # Option A: Clone from repository
   git clone https://github.com/your-repo/sql2db.git
   cd sql2db
   
   # Option B: Download and extract source zip
   # Extract sql2db-source-v0.8.0.zip
   cd sql2db
   ```

3. **Install Dependencies**
```bash
npm install
```

4. **Verify Installation**
   ```bash
   npm start
   # Should launch interactive menu
   ```

**Project Structure:**
```
sql2db/
├── app.js                  # Main interactive interface
├── package.json            # Project configuration
├── src/                    # Source code
│   ├── migrate-cli.js      # CLI entry point
│   ├── mssql-data-migrator-modular.js
│   ├── logger.js
│   ├── progress-manager.js
│   └── modules/            # Modular components
│       ├── config-manager.js
│       ├── variable-manager.js
│       ├── query-processor.js
│       └── script-processor.js
├── config/
│   └── dbinfo.json         # Database configuration
├── queries/                # Query definition files
├── resources/              # SQL resource files
├── test/                   # Test files
├── logs/                   # Log output
└── dist/                   # Built executables (after npm run build)
```

**Development Commands:**
```bash
# Run interactive interface
npm start              # English
npm run start:kr       # Korean

# Direct CLI usage
npm run migrate        # Migrate with query file
npm run validate       # Validate configuration
npm run dry-run        # Simulation mode
npm run list-dbs       # List databases

# Build standalone executable
npm run build          # Creates dist/sql2db.exe

# Create release package
npm run release        # Creates complete distribution package

# Clean build artifacts
npm run clean          # Remove dist/ and release/
```

**Advantages:**
- ✅ Full source code access
- ✅ Customizable and extensible
- ✅ Easy debugging and testing
- ✅ Can build custom executables
- ✅ Integrate with existing Node.js projects

### 3. Database Connection Setup
Edit `config/dbinfo.json` file:
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

## Method 1: Using Standalone Executable

### Launch Interactive Interface

#### Windows Explorer
1. Navigate to extracted folder
2. Double-click `run.bat` (English) or `실행하기.bat` (Korean)

#### Command Line
```bash
# Navigate to installation directory
cd C:\Tools\sql2db

# English version
run.bat

# Korean version
실행하기.bat

# Or run executable directly with language option
sql2db.exe --lang=en
sql2db.exe --lang=kr
```

### Interactive Menu
```
=========================================
  MSSQL Data Migration Tool
  Version 0.8.0
=========================================

1. Validate Query Definition File
2. Test Database Connection
3. Execute Data Migration
4. Check Migration Progress
5. Show Help
0. Exit

Please select (0-5):
```

### Menu Options Explained

#### Option 1: Validate Query Definition File
**Purpose:** Check configuration file for errors before migration

**What it checks:**
- ✅ XML/JSON syntax validity
- ✅ Attribute name correctness
- ✅ Required fields presence
- ✅ Database references validity
- ✅ Query structure integrity

**Usage Steps:**
1. Select menu option `1`
2. Choose query definition file by number
3. Review validation results
4. Fix any errors shown

**Example Output:**
```
✅ Configuration validation successful!
   - Settings: Valid
   - Queries: 5 found
   - Dynamic Variables: 3 found
   - Global Processes: 2 groups found
```

#### Option 2: Test Database Connection
**Purpose:** Verify database connectivity before migration

**What it tests:**
- ✅ Server connectivity
- ✅ Authentication credentials
- ✅ Database accessibility
- ✅ Read/Write permissions

**Usage Steps:**
1. Select menu option `2`
2. View connection test results for all databases
3. Verify all connections are successful

**Example Output:**
```
Testing database connections...

✅ sourceDB
   Server: prod-db-01.company.com
   Database: production_db
   Status: Connected
   
✅ targetDB
   Server: dev-db-01.company.com
   Database: development_db
   Status: Connected
```

#### Option 3: Execute Data Migration
**Purpose:** Run actual data migration

**Process:**
1. Select query definition file
2. Review migration summary
3. Confirm execution
4. Monitor real-time progress
5. View completion summary

**Usage Steps:**
1. Select menu option `3`
2. Choose query definition file by number
3. Type 'Y' to confirm migration
4. Wait for completion
5. Check logs for details

**Example Output:**
```
Starting data migration...

✅ Query 1/5: migrate_users
   Processed: 10,000 rows in 5.2s (1,923 rows/sec)

✅ Query 2/5: migrate_orders
   Processed: 50,000 rows in 24.5s (2,041 rows/sec)

...

✅ Data migration completed successfully!
   Total time: 2m 15s
   Total rows: 150,000
```

#### Option 4: Check Migration Progress
**Purpose:** View history and details of past migrations

**Features:**
- View recent 3 migrations by default
- Access full migration history (press 'A')
- View detailed status for any migration
- Check query-level progress
- Review error information

**Usage Steps:**
1. Select menu option `4`
2. View migration list
3. Enter number for detailed info
4. Press 'A' to see all migrations
5. Press '0' to return to main menu

**Example Output:**
```
Migration History (Recent 3):

1. migration-2025-10-11-01-45-35
   Status: COMPLETED
   Started: 2025-10-11 1:45:35 AM
   Progress: 25/25 queries
   Completed: 2025-10-11 1:48:20 AM (165s)

2. migration-2025-10-11-01-39-47
   Status: FAILED
   Started: 2025-10-11 1:39:47 AM
   Progress: 15/25 queries
   Failed: 3

Enter number to view details, 'A' for all, or '0' to go back:
```

#### Option 5: Show Help
**Purpose:** Display usage information and examples

**Information Provided:**
- Command examples
- Configuration tips
- Documentation links
- Common troubleshooting

---

## Method 2: Using Node.js Source

### Interactive Interface

#### Launch from Command Line
```bash
# Navigate to project directory
cd /path/to/sql2db

# English version
npm start
# Output: Interactive menu launches

# Korean version
npm run start:kr
# Output: 대화형 메뉴 실행
```

The interactive menu is identical to the standalone executable version.

### Command Line Interface (CLI)

#### Validate Configuration
```bash
# Validate specific query file
node src/migrate-cli.js validate --query ./queries/migration-queries.xml

# Output example:
# ✅ Configuration validation successful!
#    Settings: Valid
#    Queries: 5 found
```

#### Test Database Connections
```bash
# Test all configured databases
node src/migrate-cli.js test

# List all available databases
node src/migrate-cli.js list-dbs

# Test specific database connection
node src/migrate-cli.js list-dbs --test sourceDB
```

#### Execute Data Migration
```bash
# Normal migration
node src/migrate-cli.js migrate --query ./queries/migration-queries.xml

# Simulation mode (DRY RUN) - no actual changes
node src/migrate-cli.js migrate --query ./queries/migration-queries.xml --dry-run

# With custom batch size
BATCH_SIZE=2000 node src/migrate-cli.js migrate --query ./queries/migration-queries.xml
```

#### Resume Interrupted Migration
```bash
# List available migrations to resume
node src/progress-cli.js list

# Check resume information
node src/progress-cli.js resume migration-2025-10-11-01-45-35

# Resume migration from last completed point
node src/migrate-cli.js resume migration-2025-10-11-01-45-35 --query ./queries/migration-queries.xml
```

#### Monitor Migration Progress
```bash
# List all migrations
node src/progress-cli.js list

# Show specific migration details
node src/progress-cli.js show migration-2025-10-11-01-45-35

# Real-time monitoring (requires migration to be running)
node src/progress-cli.js monitor migration-2025-10-11-01-45-35

# Display summary of all migrations
node src/progress-cli.js summary

# Clean up old progress files (older than 7 days)
node src/progress-cli.js cleanup 7
```

### Development Commands

#### Build Standalone Executable
```bash
# Build executable (creates dist/sql2db.exe)
npm run build

# Output:
# > pkg . --public --no-native-build --compress GZip
# ✅ Build completed: dist/sql2db.exe
```

#### Create Release Package
```bash
# Create complete distribution package
npm run release

# Output:
# - Builds executable
# - Creates release directory structure
# - Copies all necessary files
# - Generates documentation
# - Creates ZIP archive
# Result: release/sql2db-v0.8.0-bin.zip
```

#### Run Tests
```bash
# Run all test files
cd test
node test-basic-migration.js
node test-column-overrides.js
node test-dynamic-variables.js
# ... etc

# Or run specific test
node test/test-dry-run.js
```

#### Environment Variables
```bash
# Set batch size
set BATCH_SIZE=2000
node src/migrate-cli.js migrate --query ./queries/migration-queries.xml

# Enable detailed logging
set ENABLE_LOGGING=true
node src/migrate-cli.js migrate --query ./queries/migration-queries.xml

# Enable transaction support
set ENABLE_TRANSACTION=true
node src/migrate-cli.js migrate --query ./queries/migration-queries.xml

# Debug mode
set DEBUG_VARIABLES=true
set DEBUG_SCRIPTS=true
node src/migrate-cli.js migrate --query ./queries/migration-queries.xml
```

### npm Scripts Reference

| Command | Description |
|---------|-------------|
| `npm start` | Launch interactive interface (English) |
| `npm run start:kr` | Launch interactive interface (Korean) |
| `npm run migrate` | Execute migration (with prompt) |
| `npm run dry-run` | Execute simulation mode (with prompt) |
| `npm run validate` | Validate configuration (with prompt) |
| `npm run resume` | Resume interrupted migration (with prompt) |
| `npm run progress` | Display progress information (with prompt) |
| `npm run test-connections` | Test all database connections |
| `npm run list-dbs` | List all configured databases |
| `npm run help` | Display help information |
| `npm run build` | Build standalone executable |
| `npm run release` | Create complete release package |
| `npm run clean` | Remove build artifacts |

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

The tool supports dynamic variables that can extract data at runtime and use it in queries. **You can now extract dynamic variables from all databases defined in dbinfo.json.**

#### 🗄️ Database Selection Feature

When extracting dynamic variables, you can use the `database` attribute to specify a particular database:

- **If not specified**: Uses `sourceDatabase` as default
- **`sourceDB`**: Extract from source database
- **`targetDB`**: Extract from target database  
- **`sampleDB`**: Extract from sample database defined in dbinfo.json
- **Other DBs**: Use any database defined in dbinfo.json

### Variable Types

| Type | Description | Access Pattern | Default |
|------|-------------|----------------|---------|
| `column_identified` | Extract all columns as arrays keyed by column name | `${varName.columnName}` | ✅ Yes |
| `key_value_pairs` | Extract first two columns as key-value pairs | `${varName.key}` | No |

### Usage Examples

#### XML Configuration
```xml
<dynamicVariables>
  <!-- Using column_identified (default) from source DB -->
  <dynamicVar id="customer_data" description="Customer information" database="sourceDB">
    <query>SELECT CustomerID, CustomerName, Region FROM Customers</query>
    <!-- extractType omitted - defaults to column_identified -->
  </dynamicVar>
  
  <!-- Using key_value_pairs from target DB -->
  <dynamicVar id="status_mapping" description="Status mapping" database="targetDB">
    <query>SELECT StatusCode, StatusName FROM StatusCodes</query>
    <extractType>key_value_pairs</extractType>
  </dynamicVar>
  
  <!-- Extract from sample DB -->
  <dynamicVar id="company_info" description="Company information" database="sampleDB">
    <query>SELECT CompanyCode, CompanyName FROM Companies</query>
    <extractType>key_value_pairs</extractType>
  </dynamicVar>
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

### 11. Advanced SQL Parsing and Comment Processing

Accurately processes complex SQL syntax and comments.

#### Supported Comment Types
```sql
-- Line comments
/* Block comments */
/* 
   Multi-line
   block comments
*/

-- Comments in strings are protected
INSERT INTO log VALUES ('-- This is not a comment');
INSERT INTO log VALUES ('/* This is also not a comment */');
```

#### Variable Processing Improvements
- **Processing Order**: Dynamic variables → Static variables → Timestamp functions → Environment variables
- **Conflict Prevention**: Higher priority variables are not overwritten by lower priority ones
- **Debugging**: Detailed variable substitution process tracking

#### Debugging Options
```bash
# Detailed variable substitution process logs
DEBUG_VARIABLES=true node src/migrate-cli.js migrate queries.xml

# Comment removal process verification
DEBUG_COMMENTS=true node src/migrate-cli.js migrate queries.xml

# Complete script processing verification
DEBUG_SCRIPTS=true node src/migrate-cli.js migrate queries.xml
```

## 🔧 Recent Improvements (Post v0.6)

### 1. Dynamic Variable Database Specification

You can now specify which database to extract data from in dynamic variables.

#### Key Improvements
- **Database Selection**: Use the `database` attribute to select source/target DB
- **Default Value**: Uses `sourceDB` as default when attribute is not specified
- **Cross-DB Utilization**: Extract conditions from source then query related data from target
- **All dbinfo.json DBs Supported**: Extract dynamic variables from all databases defined in dbinfo.json

#### Usage Examples

```xml
<!-- Extract dynamic variables from multiple databases -->
<dynamicVariables>
  <!-- Extract user list from source DB -->
  <dynamicVar variableName="sourceUsers" database="sourceDB">
    SELECT user_id FROM users WHERE status = 'ACTIVE'
  </dynamicVar>
  
  <!-- Extract department info from target DB -->
  <dynamicVar variableName="targetDepts" database="targetDB">
    SELECT dept_id FROM departments WHERE is_active = 1
  </dynamicVar>
  
  <!-- Extract company info from sample DB -->
  <dynamicVar variableName="companyInfo" database="sampleDB">
    SELECT company_code, company_name FROM companies
  </dynamicVar>
</dynamicVariables>
```

#### Usage Examples
```xml
<!-- Extract user IDs from source DB -->
<dynamicVar id="extract_source_users"
            variableName="sourceUserIds"
            extractType="single_column"
            columnName="user_id"
            database="sourceDB">
  <![CDATA[SELECT user_id FROM users WHERE status = 'ACTIVE']]>
</dynamicVar>

<!-- Extract mapping info from target DB -->
<dynamicVar id="extract_target_mapping"
            variableName="targetMapping"
            extractType="key_value_pairs"
            database="targetDB">
  <![CDATA[SELECT old_id, new_id FROM id_mapping]]>
</dynamicVar>
```

### 2. SELECT * Pattern Improvements

Fixed the issue where SQL keywords were incorrectly recognized as table aliases.

#### Improved Features
- **Accurate Alias Detection**: SQL keywords (WHERE, GROUP, HAVING, etc.) are not mistaken for aliases
- **Safe Pattern Matching**: More accurate regex pattern for table alias extraction
- **Error Prevention**: Prevents SQL errors caused by incorrect column name generation

#### Before and After Comparison
**Before (Problematic):**
```sql
-- Original query
SELECT * FROM products WHERE status = 'ACTIVE'

-- Incorrect transformation result
SELECT WHERE.product_name, WHERE.product_code, WHERE.category_id FROM products WHERE status = 'ACTIVE'
```

**After (Normal Operation):**
```sql
-- Original query
SELECT * FROM products WHERE status = 'ACTIVE'

-- Correct transformation result
SELECT product_name, product_code, category_id, price, cost FROM products WHERE status = 'ACTIVE'
```

### 3. DRY RUN Mode Enhancement

DRY RUN mode now actually extracts dynamic variables to provide more accurate simulation.

#### Enhanced Features
- **Actual Dynamic Variable Extraction**: Dynamic variables are actually extracted and stored during DRY RUN
- **Accurate Query Simulation**: Precise query validation using extracted dynamic variable values
- **Error Pre-detection**: Dynamic variable related errors are discovered during DRY RUN phase

#### Usage Example
```bash
# Validate queries with dynamic variables using DRY RUN
node src/migrate-cli.js migrate --query ./queries/migration-queries.xml --dry-run
```

**Output Example:**
```
🧪 DRY RUN Mode: Data Migration Simulation

🔍 Dynamic Variable Extraction Simulation: 3 items
  • extract_active_users: Active user ID extraction
    Query: SELECT user_id FROM users WHERE status = 'ACTIVE'
    Database: sourceDB
    Extracted values: [1001, 1002, 1003, 1005, 1008] (5 items)
  
  • extract_company_mapping: Company code mapping
    Query: SELECT company_code, company_name FROM companies
    Database: targetDB
    Extracted values: {"COMP01": "Samsung", "COMP02": "LG"} (2 pairs)

📊 Query Simulation Results:
  ✅ migrate_users: Expected 5 rows to process
  ✅ migrate_orders: Expected 25 rows to process
  ✅ migrate_products: Expected 150 rows to process
```

### 4. Error Handling and Stability Improvements

#### Key Improvements
- **Safe Variable Substitution**: Safely handles dynamic variables that haven't been extracted yet
- **Graceful Fallback**: Safely recovers to original data when features fail
- **Detailed Error Messages**: Provides clearer error information when problems occur

#### Debugging Support
```bash
# Detailed dynamic variable processing logs
DEBUG_VARIABLES=true node src/migrate-cli.js migrate queries.xml

# SELECT * processing verification
DEBUG_SCRIPTS=true node src/migrate-cli.js migrate queries.xml
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
    <dynamicVar id="active_customers" description="Active customer list">
      <query>SELECT CustomerID FROM Customers WHERE IsActive = 1</query>
    </dynamicVar>
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

#### 4. Dynamic Variable Database Errors
**Problem**: Unknown database specified in dynamic variable
**Solution**:
1. Verify the database exists in `config/dbinfo.json`
2. Check the `database` attribute in the dynamic variable
3. List available databases: `node src/migrate-cli.js list-dbs`

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

