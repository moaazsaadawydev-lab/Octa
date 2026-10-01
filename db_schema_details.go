package main

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

// GetDatabaseSchemaDetails inspects tables, columns, PKs, row counts, and foreign key relations for ERD.
func (s *DBService) GetDatabaseSchemaDetails(config ConnectionConfig, dbName string) (DatabaseSchema, error) {
	var schema DatabaseSchema
	schema.Tables = []TableSchema{}
	schema.Relationships = []ForeignKeyRelationship{}

	pool, err := s.getPool(config, dbName)
	if err != nil {
		return schema, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	tables, err := s.GetTables(config, dbName)
	if err != nil {
		return schema, err
	}

	for _, tbl := range tables {
		cols, err := s.GetTableSchema(config, dbName, tbl)
		if err != nil {
			continue
		}

		var pks []string
		for _, c := range cols {
			if c.IsPrimaryKey {
				pks = append(pks, c.Name)
			}
		}

		var rowCount int64
		countQuery := fmt.Sprintf("SELECT COUNT(*) FROM %s;", pgx.Identifier{tbl}.Sanitize())
		_ = pool.QueryRow(ctx, countQuery).Scan(&rowCount)

		schema.Tables = append(schema.Tables, TableSchema{
			Name:        tbl,
			Columns:     cols,
			PrimaryKeys: pks,
			RowCount:    rowCount,
		})
	}

	fkQuery := `SELECT
	    tc.constraint_name,
	    kcu.table_name AS source_table,
	    kcu.column_name AS source_column,
	    ccu.table_name AS target_table,
	    ccu.column_name AS target_column
	FROM information_schema.table_constraints AS tc
	JOIN information_schema.key_column_usage AS kcu
	  ON tc.constraint_name = kcu.constraint_name
	  AND tc.table_schema = kcu.table_schema
	JOIN information_schema.constraint_column_usage AS ccu
	  ON ccu.constraint_name = tc.constraint_name
	  AND ccu.table_schema = tc.table_schema
	WHERE tc.constraint_type = 'FOREIGN KEY'
	  AND tc.table_schema = 'public';`

	start := time.Now()
	fkRows, err := pool.Query(ctx, fkQuery)
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0

	if err == nil {
		s.logQuery(fkQuery, durationMs, "SUCCESS", "")
		defer fkRows.Close()
		for fkRows.Next() {
			var rel ForeignKeyRelationship
			if err := fkRows.Scan(&rel.ConstraintName, &rel.SourceTable, &rel.SourceColumn, &rel.TargetTable, &rel.TargetColumn); err == nil {
				schema.Relationships = append(schema.Relationships, rel)
			}
		}
	} else {
		s.logQuery(fkQuery, durationMs, "ERROR", err.Error())
	}

	return schema, nil
}
