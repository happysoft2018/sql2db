# SQL2DB Migration Tool Update Log

## 🚀 v0.8.3 - Case-Insensitive Column Matching & Enhanced Debugging (2025-10-17)

### ✨ New Features

#### Case-Insensitive Column Matching
- **identityColumns**: Automatically matches target table columns regardless of case
  - Example: `identityColumns="username"` matches both `username` and `Username` in target table
  - Prevents delete failures due to case mismatch
  
- **globalColumnOverrides**: Case-insensitive column name handling
  - Column names defined with any case (e.g., `Created_By`, `CREATED_BY`, `created_by`) are treated as the same
  - Duplicate detection ignores case differences
  - Applies override values to actual table column names
  
- **applyGlobalColumns**: Case-insensitive keyword and column name matching
  - Keywords: `all`, `All`, `ALL`, `none`, `None`, `NONE` all work
  - Column names: `UpdatedBy`, `updatedby`, `UPDATEDBY` all match
  - Multiple columns: `created_by, STATUS` matches any case combination

#### Password Masking in Logs
- **Automatic password masking**: All password fields in logs are automatically masked with `********`
- **Masked fields**: `password`, `pwd`, `passwd`, and any field containing "password"
- **Applies to**: Console output and log files
- **Nested objects**: Recursively masks passwords in nested configurations

### 🔧 Improvements

#### SQL Server 2100 Parameter Limit Handling
- **Automatic chunking**: `deleteBeforeInsert` now splits large PK sets into chunks
- **Chunk size calculation**:
  - Single key: 2000 values per chunk
  - Composite key (2 columns): 1000 values per chunk
  - Composite key (3 columns): 666 values per chunk
- **Progress logging**: Shows chunk processing progress for large datasets
- **No more parameter limit errors**: Handles any number of rows

#### Enhanced Delete Operation Debugging
- **Database identification**: Clearly shows which database (source/target) is being used
- **Detailed diagnostics**: Automatic diagnosis when delete operations fail
  - Shows target table row count
  - Tests sample PK values
  - Displays actual PK values in target table
  - Suggests possible causes
- **Informative messages**: 
  - "Table is empty, proceeding with INSERT only"
  - "Target table has N rows but no matching source PK values"

### 🐛 Bug Fixes
- **deleteBeforeInsert parameter overflow**: Fixed SQL Server 2100 parameter limit error
- **Case-sensitive column matching**: Fixed failures when XML column names don't match exact database case
- **Global column override not applied**: Fixed override failure when column names have different cases
- **identityColumns mismatch**: Fixed delete operation skip due to case differences

### 📝 Technical Changes
- **mssql-connection-manager.js**:
  - Added `normalizeColumnName()` for case-insensitive column matching
  - Implemented chunking in `deleteFromTargetByPK()`
  - Enhanced logging with database information and diagnostics
  
- **config-manager.js**:
  - Added case-insensitive duplicate detection in `parseGlobalColumnOverrides()`
  - First-defined column name format is preserved
  
- **mssql-data-migrator-modular.js**:
  - Updated `selectivelyApplyGlobalColumnOverrides()` with case-insensitive matching
  - Column map creation for efficient case-insensitive lookups
  
- **modules/variable-manager.js**:
  - Updated `applyGlobalColumnOverrides()` to find actual column names case-insensitively
  - Ensures override values are applied to correct columns
  
- **logger.js**:
  - Added `maskSensitiveData()` method
  - Automatic password masking in all log outputs

### 🎯 Usage Examples

#### Case-Insensitive Column Matching
```xml
<!-- globalColumnOverrides definition -->
<globalColumnOverrides>
  <override column="Created_By">SYSTEM</override>
  <override column="UPDATED_BY">ADMIN</override>
</globalColumnOverrides>

<!-- All these work regardless of case -->
<query>
  <sourceQuery applyGlobalColumns="created_by, updated_by">
    SELECT * FROM users
  </sourceQuery>
</query>

<query>
  <sourceQuery applyGlobalColumns="CREATED_BY, UPDATED_BY">
    SELECT * FROM products
  </sourceQuery>
</query>
```

#### identityColumns Case Handling
```xml
<!-- Works even if target table has "Username" (capital U) -->
<sourceQuery 
  targetTable="users" 
  identityColumns="username"
  deleteBeforeInsert="true">
  SELECT * FROM users
</sourceQuery>
```

## 🚀 v0.8.2 - Structure Improvements & Enhanced Validation (2025-10-14)

### 🔧 Technical Improvements

#### Improved dbinfo.json Structure
- **Removed dbs wrapper**: DB settings placed directly in root
  - Before: `{"dbs": {"sampleDB": {...}}}`
  - After: `{"sampleDB": {...}}`
  - More concise structure for better readability
  - All related code updated:
    - `mssql-connection-manager.js`: config.dbs → config directly
    - `migrate-cli.js`: dbInfo.dbs → dbInfo directly
    - `config-manager.js`: dbInfo.dbs → dbInfo directly

#### Improved pkg Environment Path Handling
- **Using APP_ROOT constant**: Correct file paths in both pkg and development environments
  - `mssql-connection-manager.js`: Added pkg environment path handling
  - `migrate-cli.js`: Improved --xml option parsing in validate command
  - Added debug logs: Track queryDef parsing process

### 🐛 Bug Fixes
- **validate command queryDef recognition error**: Improved id attribute recognition in queryDef
- **validate-config.bat infinite loop**: Improved with file selection menu
- **pkg environment file path error**: Resolved by using APP_ROOT

## 🚀 v0.8.1 - XML-Only Configuration Support (2025-10-11)

### 🔄 Breaking Changes

#### Removed JSON Query Definition File Support
- **XML Only**: Query definition files now support XML format only
- **Simplified Architecture**: Removed JSON parsing logic for cleaner codebase
- **Clear Error Messages**: Provides clear error when attempting to use JSON files
- **Consistent Documentation**: All documentation updated to reflect XML-only support

### 📝 Changes

#### Code Updates
- **migrate-cli.js**: Updated help text to specify XML format only
- **config-manager.js**: Added validation to reject non-XML files
- **Removed Files**: Deleted `queries/migration-queries.json` sample file

#### Documentation Updates
- **README.md**: Removed JSON format section and examples
- **README_KR.md**: Removed JSON format section and examples
- **USER_MANUAL.md**: Updated configuration format description
- **USER_MANUAL_KR.md**: Updated configuration format description
- **CHANGELOG.md**: Removed JSON references
- **CHANGELOG_KR.md**: Removed JSON references

### 💡 Migration Guide

If you were using JSON query definition files:

1. **Convert to XML**: Use the XML format structure as shown in documentation
2. **Update File Extension**: Change `.json` to `.xml`
3. **Adjust Syntax**: Follow XML structure with proper tags and CDATA sections

**Example Conversion:**
```json
// Old JSON format (no longer supported)
{
  "queries": [{
    "id": "migrate_users",
    "sourceQuery": "SELECT * FROM users"
  }]
}
```

```xml
<!-- New XML format -->
<migration>
  <queries>
    <query id="migrate_users">
      <sourceQuery>
        <![CDATA[SELECT * FROM users]]>
      </sourceQuery>
    </query>
  </queries>
</migration>
```

### 🎯 Rationale

- **Single Format**: Maintaining one configuration format reduces complexity
- **Better Structure**: XML provides better structure for complex configurations
- **CDATA Support**: XML CDATA sections handle SQL queries more naturally
- **Industry Standard**: XML is more common for database migration tools

---

## 🚀 v0.8.0 - Interactive Interface & Standalone Executable (2025-10-11)

### ✨ New Features

#### Interactive Command-Line Interface (app.js)
- **User-Friendly Menu**: Interactive menu system for easy operation
- **File Selection by Number**: Select query definition files by number instead of typing full path
- **Multilingual Support**: English and Korean interface support (--lang option)
- **Integrated Operations**: All common operations accessible from single interface
  - Query definition file validation
  - Database connection testing
  - Data migration execution
  - Migration progress monitoring

#### Migration Progress Monitoring
- **Recent History View**: Display recent 3 migrations by default
- **Full History Access**: Toggle to view all migration history with 'A' command
- **Detailed Progress Info**: View comprehensive details for any migration
  - Migration status and timestamps
  - Query-level progress tracking
  - Row counts and processing speed
  - Error information and stack traces
- **Interactive Navigation**: Easy navigation between list and detail views

#### Standalone Executable Support
- **PKG Integration**: Build standalone Windows executable with `npm run build`
- **No Node.js Required**: Run migrations without Node.js installation
- **Complete Package**: Includes all dependencies and assets
- **Optimized Build**: GZip compression for smaller file size
- **Path Resolution**: Automatic path handling for packaged environment

#### Automated Release Process
- **Release Script**: Comprehensive `release.bat` for automated packaging
- **Package Structure**: Professional release package with organized directories
- **Launcher Scripts**: Dedicated batch files for English and Korean versions
- **Documentation**: Includes version info, release notes, and manuals
- **ZIP Archive**: Automatic ZIP file creation for distribution

### 🔄 Improvements

#### Modular Architecture Refactoring
- **Separated Concerns**: Split monolithic code into focused modules
  - `config-manager.js`: Configuration loading and parsing
  - `variable-manager.js`: Dynamic variable management
  - `query-processor.js`: SQL query processing
  - `script-processor.js`: Pre/Post script execution
- **Improved Maintainability**: Easier to understand and modify code
- **Better Testing**: Individual modules can be tested independently
- **API Compatibility**: Maintains backward compatibility with existing configurations

#### Enhanced Configuration Validation
- **Attribute Name Validation**: Validates all XML attribute names
- **Detailed Error Messages**: Shows allowed attributes when validation fails
- **Comprehensive Checks**: Validates all configuration sections
  - Settings attributes
  - Query attributes
  - Dynamic variable attributes
  - Pre/Post process attributes
  - Global process group attributes

#### PKG Environment Support
- **Path Resolution**: Correct `__dirname` handling in packaged executables
- **Directory Creation**: Fallback mechanisms for log and output directories
- **Module Loading**: Direct module require() instead of CLI execution
- **Asset Inclusion**: Proper bundling of queries, configs, and resources

### 🛠️ Usage Examples

#### Interactive Interface
```bash
# English version
npm start
# or
run.bat

# Korean version
npm run start:kr
# or
실행하기.bat

# Standalone executable
sql2db.exe --lang=en
sql2db.exe --lang=kr
```

#### Progress Monitoring
```
Migration History (Recent 3):

1. migration-2025-10-11-01-45-35
   Status: COMPLETED
   Started: 2025-10-11 1:45:35 AM
   Progress: 25/25 queries
   Completed: 2025-10-11 1:48:20 AM (165s)

Showing 3 of 15 migration(s)

Enter number to view details, 'A' for all, or '0' to go back:
```

#### Building Executable
```bash
# Build standalone executable
npm run build

# Create release package
npm run release

# Output: release/sql2db-v0.8.0-bin.zip
```

### 📦 Release Package Contents
- `sql2db.exe`: Standalone executable
- `run.bat`: English launcher
- `실행하기.bat`: Korean launcher
- `config/`: Database configuration files
- `queries/`: Query definition files
- `resources/`: SQL resource files
- `user_manual/`: Complete documentation

### 🔧 Technical Improvements
- **Better Error Handling**: Comprehensive error messages in packaged environment
- **Memory Management**: Optimized resource usage for CLI interface
- **File System Operations**: Safe directory creation with fallback options
- **Console Output**: Improved formatting and color-coded messages

### 📊 Performance
- **Fast Startup**: Quick initialization of interactive interface
- **Efficient Progress Tracking**: Minimal overhead for monitoring
- **Optimized Build**: ~50MB executable with all dependencies

### 🎯 Migration Path
- **Zero Configuration**: Existing query files work without changes
- **API Compatible**: All CLI commands still functional
- **Progressive Enhancement**: Choose between CLI and interactive interface

---

## 🔧 v0.7.1 - Multi-Database Dynamic Variable Support Extension (2025-09-01)

### ✨ New Features

#### Dynamic Variable Extraction Support from All Databases in dbinfo.json
- **Full DB Support**: Extract dynamic variables from all databases defined in dbinfo.json
- **Automatic Connection Management**: Create and manage separate connection pools for each database
- **Enhanced Error Handling**: Display available database list when invalid DB is specified

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

### 🔄 Improvements

#### Connection Manager Extension
- **loadDBConfigs()**: Automatically load DB configurations from dbinfo.json
- **connectToDB(dbKey)**: Connect to specific database
- **queryDB(dbKey, query)**: Execute query on specific database
- **getAvailableDBKeys()**: Return list of all available database keys
- **disconnectDB(dbKey)**: Disconnect specific database
- **disconnectAllDBs()**: Disconnect all databases

#### Dynamic Variable Extraction Logic Improvements
- **Database Validation**: Verify specified database exists in dbinfo.json
- **Automatic Connection**: Automatically connect to required database during dynamic variable extraction
- **Enhanced Error Messages**: Provide clear error information with available database list

### 🛠️ Technical Improvements
- **Connection Pool Management**: Create and manage independent connection pools for each database
- **Memory Optimization**: Automatically release unnecessary connections
- **Error Recovery**: Appropriate error handling and recovery for database connection failures

### 📊 Use Cases
- **Complex Migration**: Extract condition data from multiple databases for integrated migration
- **Cross-DB Reference**: Extract master data from source and mapping information from target
- **Test Environment**: Extract test data from sample database for migration validation

---

## 🔧 v0.7 - Dynamic Variable and SQL Processing Improvements (2025-08-29)

### ✨ New Features

#### Dynamic Variable Database Specification
- **Database Selection**: Use `database` attribute in dynamic variables to select source/target DB
- **Default Value**: Uses `sourceDB` as default when attribute is not specified
- **Cross-DB Utilization**: Extract conditions from source then query related data from target

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

### 🔄 Improvements

#### SELECT * Pattern Improvements
- **Accurate Alias Detection**: SQL keywords (WHERE, GROUP, HAVING, etc.) are not mistaken for aliases
- **Safe Pattern Matching**: More accurate regex pattern for table alias extraction
- **Error Prevention**: Prevents SQL errors caused by incorrect column name generation

**Before and After Comparison:**
```sql
-- Before (Problematic)
SELECT * FROM products WHERE status = 'ACTIVE'
-- Incorrect transformation: SELECT WHERE.product_name, WHERE.product_code FROM products WHERE status = 'ACTIVE'

-- After (Normal Operation)
SELECT * FROM products WHERE status = 'ACTIVE'
-- Correct transformation: SELECT product_name, product_code, category_id FROM products WHERE status = 'ACTIVE'
```

#### DRY RUN Mode Enhancement
- **Actual Dynamic Variable Extraction**: Dynamic variables are actually extracted and stored during DRY RUN
- **Accurate Query Simulation**: Precise query validation using extracted dynamic variable values
- **Error Pre-detection**: Dynamic variable related errors are discovered during DRY RUN phase

#### Error Handling and Stability Improvements
- **Safe Variable Substitution**: Safely handles dynamic variables that haven't been extracted yet
- **Graceful Fallback**: Safely recovers to original data when features fail
- **Detailed Error Messages**: Provides clearer error information when problems occur

### 🛠️ Debugging Support
```bash
# Detailed dynamic variable processing logs
DEBUG_VARIABLES=true node src/migrate-cli.js migrate queries.xml

# SELECT * processing verification
DEBUG_SCRIPTS=true node src/migrate-cli.js migrate queries.xml
```

### 📊 Use Cases
- **Source DB Extraction**: Identify migration target data
- **Target DB Extraction**: Query existing mapping information or reference data
- **Cross-DB Utilization**: Extract conditions from source then query related data from target

---

## 🔧 v0.6 - Processing Stage Column Override Control (2024-08-14)

### ✨ New Features

#### Processing Stage applyGlobalColumns Control
- **Granular Control**: Individual applyGlobalColumns settings for preProcess, sourceQuery, postProcess stages
- **Flexible Column Application**: Apply only necessary global columns per stage purpose
- **Performance Optimization**: Skip unnecessary column processing for performance improvement

#### Stage-specific Configuration Method
```xml
<query id="migrate_users" targetTable="users" ...>
  <preProcess description="Backup" applyGlobalColumns="created_by,updated_by">
    <![CDATA[INSERT INTO user_backup SELECT * FROM users;]]>
  </preProcess>
  
  <sourceQuery applyGlobalColumns="all">
    <![CDATA[SELECT user_id, username, email FROM users_source;]]>
  </sourceQuery>
  
  <postProcess description="Logging" applyGlobalColumns="migration_date">
    <![CDATA[INSERT INTO migration_log VALUES ('users', GETDATE());]]>
  </postProcess>
</query>
```

### 🔄 Changes
- **Previous**: Single applyGlobalColumns setting at query level
- **New**: Independent applyGlobalColumns settings for each processing stage

### 📝 Usage Examples

#### Stage-specific Column Application
- **preProcess**: Only creator information (`created_by`) for backup tables
- **sourceQuery**: All columns (`all`) for actual data migration
- **postProcess**: Only timestamp (`migration_date`) for log tables

This enables optimized column override application tailored to each stage's purpose.

## 🎯 v0.5 - Global Pre/Post-processing Group Management (2024-08-14)

### ✨ New Features

#### Global Pre/Post-processing Group System
- **Simple Grouping**: Manage pre/post-processing by functional groups within globalProcesses
- **Sequential Execution**: Execute groups in defined order
- **Individual Control**: Enable/disable settings per group
- **Complete Dynamic Variable Support**: Use dynamic variables in all groups

#### Default Provided Groups Example
1. **performance_setup**: Performance optimization settings (disable indexes/constraints)
2. **logging**: Migration log initialization
3. **validation**: Data validation and quality checks
4. **performance_restore**: Performance optimization restoration (re-enable indexes/constraints)
5. **verification**: Post-migration data verification
6. **completion**: Completion logging and statistics

### 🔄 Execution Order
1. **Global Pre-processing Groups** (in defined order)
2. Dynamic variable extraction
3. Individual query migration
4. **Global Post-processing Groups** (in defined order)

### 🛡️ Error Handling
- **Pre-processing Group Error**: Abort entire migration
- **Post-processing Group Error**: Warning log then continue with next group

### 📝 Usage Examples

#### XML Group Configuration
```xml
<globalProcesses>
  <preProcessGroups>
    <group id="performance_setup" description="Performance optimization setup" enabled="true">
      <![CDATA[
        -- Disable indexes
        ALTER INDEX ALL ON users DISABLE;
        ALTER INDEX ALL ON products DISABLE;
        
        -- Disable constraints
        ALTER TABLE users NOCHECK CONSTRAINT ALL;
        ALTER TABLE products NOCHECK CONSTRAINT ALL;
      ]]>
    </group>
    
    <group id="validation" description="Data validation" enabled="true">
      <![CDATA[
        -- Check for duplicate data (using dynamic variables)
        IF EXISTS (SELECT user_id, COUNT(*) FROM users_source GROUP BY user_id HAVING COUNT(*) > 1)
        BEGIN
          RAISERROR('Duplicate user IDs found.', 16, 1);
        END
        
        -- Active user validation
        INSERT INTO validation_log 
        SELECT 'ACTIVE_USER_CHECK', COUNT(*), GETDATE()
        FROM users_source WHERE user_id IN (${activeUserIds});
      ]]>
    </group>
  </preProcessGroups>
  
  <postProcessGroups>
    <group id="performance_restore" description="Performance optimization restoration" enabled="true">
      <![CDATA[
        -- Re-enable constraints
        ALTER TABLE users WITH CHECK CHECK CONSTRAINT ALL;
        ALTER TABLE products WITH CHECK CHECK CONSTRAINT ALL;
        
        -- Re-enable indexes
        ALTER INDEX ALL ON users REBUILD;
        ALTER INDEX ALL ON products REBUILD;
      ]]>
    </group>
    
    <group id="completion" description="Completion logging" enabled="true">
      <![CDATA[
        -- Final statistics
        INSERT INTO migration_completion_log 
        SELECT 'MIGRATION_COMPLETE', GETDATE(), 
               (SELECT COUNT(*) FROM users),
               (SELECT COUNT(*) FROM products);
      ]]>
    </group>
  </postProcessGroups>
</globalProcesses>
```

## 🔄 v0.4 - Dynamic Variables System Enhancement (2024-08-13)

### ✨ New Features

#### Enhanced Dynamic Variables System
- **Default Type Simplification**: When `extractType` is not specified, automatically defaults to `column_identified` behavior
- **Improved Variable Types**: Streamlined to 2 types instead of 3 for better usability
- **Enhanced Error Handling**: Better handling of unresolved variables and edge cases

### 🔄 Changes

#### Default Type Behavior
- **Previous**: Required explicit `extractType` specification
- **New**: Defaults to `column_identified` when `extractType` is omitted

#### Variable Type Simplification
| Type | Description | Access Pattern | Default |
|------|-------------|----------------|---------|
| `column_identified` | Extract all columns as arrays keyed by column name | `${varName.columnName}` | ✅ Yes |
| `key_value_pairs` | Extract first two columns as key-value pairs | `${varName.key}` | No |

### 📝 Usage Examples

#### Simplified Configuration
```xml
<dynamicVariables>
  <!-- Using column_identified (default) - no extractType needed -->
  <dynamicVar id="customer_data" description="Customer information">
    <query>SELECT CustomerID, CustomerName, Region FROM Customers</query>
  </dynamicVar>
  
  <!-- Using key_value_pairs - explicit specification required -->
  <dynamicVar id="status_mapping" description="Status mapping">
    <query>SELECT StatusCode, StatusName FROM StatusCodes</query>
    <extractType>key_value_pairs</extractType>
  </dynamicVar>
</dynamicVariables>
```

### 🔧 Improvements
- **Usability Enhancement**: Reduced configuration complexity by making `column_identified` the default
- **Consistency**: Aligned with sql2excel behavior for cross-tool consistency
- **Documentation**: Updated all documentation to reflect new default behavior

## 📈 v0.3.0 - Progress Management System (2024-08-12)

### ✨ New Features

#### Real-time Progress Tracking
- **Live Monitoring**: Real-time migration progress monitoring
- **Performance Metrics**: Processing speed and estimated completion time
- **Detailed Analysis**: Phase, query, and batch-level detailed information
- **Interruption Recovery**: Resume interrupted migrations from completed point
- **Permanent Storage**: Progress file for history management
- **CLI Tools**: Various query and management commands

### 🛠️ Progress Management Commands
```bash
# List all migrations
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

### 📊 Progress File Structure
```json
{
  "migrationId": "migration-2024-12-01-15-30-00",
  "startTime": "2024-12-01T15:30:00.000Z",
  "status": "IN_PROGRESS",
  "totalQueries": 5,
  "completedQueries": 2,
  "currentQuery": "migrate_users",
  "currentBatch": 1500,
  "totalBatches": 5000,
  "progress": {
    "percentage": 40.0,
    "estimatedCompletion": "2024-12-01T16:45:00.000Z"
  }
}
```

## ⭐ v0.2.3 - SELECT * Auto Processing (2024-08-11)

### ✨ New Features

#### SELECT * Auto Processing
- **Auto Detection**: Automatically detects `SELECT * FROM table_name` patterns
- **IDENTITY Column Exclusion**: Automatically identifies and excludes IDENTITY columns from target tables
- **Automatic Column List Generation**: Automatically sets `targetColumns`
- **Source Query Transformation**: Converts `SELECT *` to explicit column lists

### 📝 Usage Example
```xml
<query id="migrate_users" targetTable="users" enabled="true">
  <sourceQuery>
    <![CDATA[SELECT * FROM users WHERE status = 'ACTIVE']]>
  </sourceQuery>
  <!-- targetColumns automatically set (IDENTITY columns excluded) -->
</query>
```

### 🔄 Processing Steps
1. Detect `SELECT *` pattern
2. Query all columns from target table
3. Identify and exclude IDENTITY columns
4. Automatically set `targetColumns`
5. Transform source query to explicit column list

### 📋 Log Example
```
SELECT * detected. Automatically retrieving column information for table users.
IDENTITY column auto-excluded: id
Auto-set column list (15 columns, IDENTITY excluded): name, email, status, created_date, ...
Modified source query: SELECT name, email, status, created_date, ... FROM users WHERE status = 'ACTIVE'
```

## 🔧 v0.2.1 - Column Override Enhancements (2024-08-10)

### ✨ New Features

#### Enhanced Column Override System
- **Global Column Overrides**: Apply overrides to all queries
- **Pre/Post-processing Overrides**: Apply overrides in pre/post-processing scripts
- **Advanced SQL Parsing**: Support for complex SQL statements with comments
- **Improved Error Handling**: Better error messages and recovery

### 📝 Usage Examples

#### Global Column Overrides
```xml
<!-- Simple values -->
<globalColumnOverrides>
  <override column="created_by">SYSTEM</override>
  <override column="created_date">${CURRENT_TIMESTAMP}</override>
  <override column="migration_source">LEGACY_SYSTEM</override>
</globalColumnOverrides>

<!-- JSON values -->
<globalColumnOverrides>
  <override column="data_version">{"users": "2.1", "orders": "2.2", "products": "2.3", "default": "2.0"}</override>
  <override column="migration_date">{"sourceDB": "${CURRENT_DATE}", "targetDB": "2024-12-31", "default": "${CURRENT_DATE}"}</override>
</globalColumnOverrides>
```

#### Pre/Post-processing Overrides
```xml
<preProcess description="Backup with overrides" applyGlobalColumns="all">
  <![CDATA[
    INSERT INTO backup_table (id, name, created_by, created_date)
    SELECT id, name, 'BACKUP_SYSTEM', GETDATE()
    FROM target_table;
  ]]>
</preProcess>
```

## 🔄 v0.2.0 - Dynamic Variables System (2024-08-09)

### ✨ New Features

#### Dynamic Variables System
- **Runtime Data Extraction**: Extract data from database at runtime
- **Variable Types**: Support for `column_identified` and `key_value_pairs` types
- **Query Integration**: Use dynamic variables in migration queries
- **Error Handling**: Graceful handling of variable resolution failures
- **Database Selection**: Support for `database` attribute to specify source or target database

### 📝 Usage Examples

#### Dynamic Variable Definition
```xml
<dynamicVariables>
  <dynamicVar id="active_customers" description="Active customer list">
    <query>SELECT CustomerID FROM Customers WHERE IsActive = 1</query>
    <extractType>column_identified</extractType>
    <database>sourceDB</database>
  </dynamicVar>
  
  <dynamicVar id="status_mapping" description="Status mapping">
    <query>SELECT StatusCode, StatusName FROM StatusCodes</query>
    <extractType>key_value_pairs</extractType>
    <database>sourceDB</database>
  </dynamicVar>
  
  <dynamicVar id="max_order_id" description="Maximum order ID">
    <query>SELECT MAX(OrderID) as max_id FROM Orders</query>
    <extractType>single_value</extractType>
    <database>targetDB</database>
  </dynamicVar>
</dynamicVariables>
```

#### Usage in Queries
```sql
SELECT * FROM Orders 
WHERE CustomerID IN (${active_customers.CustomerID})
  AND Status IN (${status_mapping.StatusCode})
```

## 📋 v0.1.9 - Logging and Monitoring (2024-08-08)

### ✨ New Features

#### Enhanced Logging System
- **5-Level Logging**: DEBUG, INFO, WARN, ERROR, FATAL
- **Structured Logs**: JSON format for better parsing
- **Log Rotation**: Automatic log file rotation
- **Performance Metrics**: Detailed performance tracking

#### Real-time Monitoring
- **Live Progress**: Real-time migration progress display
- **Performance Charts**: Visual performance metrics
- **Interactive Interface**: Keyboard-based monitoring interface

### 📊 Log Levels
- **DEBUG**: Detailed debugging information
- **INFO**: General migration progress information
- **WARN**: Warning messages (non-critical issues)
- **ERROR**: Error messages (migration may continue)
- **FATAL**: Critical errors (migration stops)

## 🛠️ v0.1.8 - CLI and Batch Improvements (2024-08-07)

### ✨ New Features

#### Enhanced CLI Interface
- **Interactive Menu**: User-friendly interactive menu system
- **Command Validation**: Improved command validation and error messages
- **Help System**: Comprehensive help documentation
- **Batch File Support**: Windows batch files for easy execution

#### New Commands
```bash
# Interactive menu
migrate.bat

# Configuration validation
node src/migrate-cli.js validate --query ./queries/migration-queries.xml

# Database connection test
node src/migrate-cli.js list-dbs

# Dry run simulation
node src/migrate-cli.js migrate --query ./queries/migration-queries.xml --dry-run
```

## 🔄 v0.1.7 - Transaction and Error Handling (2024-08-06)

### ✨ New Features

#### Transaction Support
- **Automatic Transactions**: Automatic transaction management
- **Rollback on Error**: Automatic rollback on migration errors
- **Commit Control**: Manual commit control options
- **Isolation Levels**: Configurable transaction isolation levels

#### Enhanced Error Handling
- **Detailed Error Messages**: Comprehensive error information
- **Error Recovery**: Automatic error recovery mechanisms
- **Retry Logic**: Automatic retry for transient errors
- **Error Logging**: Detailed error logging and reporting

## 📊 v0.1.6 - Performance Optimizations (2024-08-05)

### ✨ New Features

#### Performance Improvements
- **Batch Processing**: Optimized batch processing for large datasets
- **Memory Management**: Improved memory usage and garbage collection
- **Connection Pooling**: Enhanced connection pool management
- **Query Optimization**: Automatic query optimization

#### Configuration Options
```xml
<settings>
  <batchSize>1000</batchSize>
  <connectionPool>
    <min>5</min>
    <max>20</max>
    <acquireTimeout>60000</acquireTimeout>
  </connectionPool>
  <performance>
    <enableQueryOptimization>true</enableQueryOptimization>
    <enableBatchProcessing>true</enableBatchProcessing>
  </performance>
</settings>
```

## 🔧 v0.1.5 - Configuration Enhancements (2024-08-04)

### ✨ New Features

#### Enhanced Configuration
- **JSON Support**: Full JSON configuration support
- **Environment Variables**: Environment variable substitution
- **Configuration Validation**: Comprehensive configuration validation
- **Default Values**: Sensible default values for all settings

#### Configuration Examples
```json
{
  "databases": {
    "source": "sourceDB",
    "target": "targetDB"
  },
  "settings": {
    "batchSize": 1000,
    "logLevel": "INFO"
  },
  "queries": [
    {
      "id": "migrate_users",
      "sourceQuery": "SELECT * FROM users WHERE status = 'ACTIVE'",
      "targetTable": "users",
      "enabled": true
    }
  ]
}
```

## 📋 v0.1.4 - Documentation and Examples (2024-08-03)

### ✨ New Features

#### Comprehensive Documentation
- **User Manual**: Complete user manual with examples
- **API Documentation**: Detailed API documentation
- **Configuration Guide**: Step-by-step configuration guide
- **Troubleshooting Guide**: Common issues and solutions

#### Example Files
- **Sample Configurations**: XML and JSON example files
- **Database Scripts**: Sample database creation scripts
- **Test Data**: Sample data for testing
- **Migration Examples**: Real-world migration examples

## 🔄 v0.1.3 - Core Migration Engine (2024-08-02)

### ✨ New Features

#### Core Migration Engine
- **Basic Migration**: Core data migration functionality
- **Column Mapping**: Automatic column mapping
- **Data Type Handling**: Comprehensive data type support
- **Error Handling**: Basic error handling and reporting

#### Initial Features
- XML configuration support
- Basic SQL Server connectivity
- Simple data transfer
- Basic logging

## 📊 v0.1.2 - Foundation (2024-08-01)

### ✨ New Features

#### Project Foundation
- **Project Structure**: Initial project structure
- **Dependencies**: Core Node.js dependencies
- **Basic Configuration**: Initial configuration system
- **Documentation**: Basic project documentation

## 🔧 v0.1.1 - Initial Release (2024-07-31)

### ✨ New Features

#### Initial Release
- **Basic Functionality**: Core migration tool functionality
- **SQL Server Support**: SQL Server database support
- **Node.js Platform**: Node.js-based implementation
- **Open Source**: MIT license

---

**Contact**: sql2db.nodejs@gmail.com  
**Website**: sql2db.com  
**License**: MIT License
