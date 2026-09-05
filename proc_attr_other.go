//go:build !windows
// +build !windows

package main

import (
	"syscall"

	"octa/internal/executil"
)

// getSysProcAttr returns standard process attributes on non-Windows platforms
func getSysProcAttr() *syscall.SysProcAttr {
	return executil.GetSysProcAttr()
}
