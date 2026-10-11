package main

import (
	"strings"
)

// splitSQLStatements splits a multi-statement SQL string by semicolons,
// safely ignoring semicolons inside single quotes, double quotes, dollar-quoted blocks ($$...$$),
// line comments (-- ...), and block comments (/* ... */).
func splitSQLStatements(sql string) []string {
	var statements []string
	var current strings.Builder

	inSingleQuote := false
	inDoubleQuote := false
	inLineComment := false
	inBlockComment := false
	inDollarQuote := false
	dollarTag := ""

	runes := []rune(sql)
	n := len(runes)

	for i := 0; i < n; i++ {
		r := runes[i]
		var next rune
		if i+1 < n {
			next = runes[i+1]
		}

		// 1. Line comment (-- ...)
		if inLineComment {
			current.WriteRune(r)
			if r == '\n' {
				inLineComment = false
			}
			continue
		}

		// 2. Block comment (/* ... */)
		if inBlockComment {
			current.WriteRune(r)
			if r == '*' && next == '/' {
				current.WriteRune(next)
				i++
				inBlockComment = false
			}
			continue
		}

		// 3. Dollar-quoted string ($$...$$ or $tag$...$tag$)
		if inDollarQuote {
			current.WriteRune(r)
			if r == '$' {
				remaining := string(runes[i:])
				if strings.HasPrefix(remaining, dollarTag) {
					for k := 1; k < len([]rune(dollarTag)); k++ {
						current.WriteRune(runes[i+k])
					}
					i += len([]rune(dollarTag)) - 1
					inDollarQuote = false
					dollarTag = ""
				}
			}
			continue
		}

		// 4. Single-quoted literal ('...')
		if inSingleQuote {
			current.WriteRune(r)
			if r == '\'' {
				if next == '\'' {
					current.WriteRune(next)
					i++
				} else {
					inSingleQuote = false
				}
			} else if r == '\\' && i+1 < n {
				current.WriteRune(next)
				i++
			}
			continue
		}

		// 5. Double-quoted identifier ("...")
		if inDoubleQuote {
			current.WriteRune(r)
			if r == '"' {
				inDoubleQuote = false
			}
			continue
		}

		// Start of line comment
		if r == '-' && next == '-' {
			current.WriteRune(r)
			current.WriteRune(next)
			i++
			inLineComment = true
			continue
		}

		// Start of block comment
		if r == '/' && next == '*' {
			current.WriteRune(r)
			current.WriteRune(next)
			i++
			inBlockComment = true
			continue
		}

		// Start of dollar quote ($$ or $tag$)
		if r == '$' {
			tag, tagLen := matchDollarQuoteTag(runes[i:])
			if tagLen > 0 {
				dollarTag = tag
				inDollarQuote = true
				for k := 0; k < tagLen; k++ {
					current.WriteRune(runes[i+k])
				}
				i += tagLen - 1
				continue
			}
		}

		// Start of single quote
		if r == '\'' {
			inSingleQuote = true
			current.WriteRune(r)
			continue
		}

		// Start of double quote
		if r == '"' {
			inDoubleQuote = true
			current.WriteRune(r)
			continue
		}

		// Semicolon delimiter
		if r == ';' {
			stmt := strings.TrimSpace(current.String())
			if stmt != "" {
				statements = append(statements, stmt)
			}
			current.Reset()
			continue
		}

		current.WriteRune(r)
	}

	trailing := strings.TrimSpace(current.String())
	if trailing != "" {
		statements = append(statements, trailing)
	}

	return statements
}

// matchDollarQuoteTag checks if the slice starts with a valid Postgres dollar tag ($...$)
func matchDollarQuoteTag(runes []rune) (string, int) {
	if len(runes) < 2 || runes[0] != '$' {
		return "", 0
	}
	for i := 1; i < len(runes); i++ {
		if runes[i] == '$' {
			tag := string(runes[:i+1])
			return tag, i + 1
		}
		r := runes[i]
		// Tag characters can be letters, digits, or underscore
		if !(r >= 'a' && r <= 'z') && !(r >= 'A' && r <= 'Z') && !(r >= '0' && r <= '9') && r != '_' {
			return "", 0
		}
	}
	return "", 0
}
