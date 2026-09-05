//go:build windows
// +build windows

package main

import (
	"syscall"

	"octa/internal/executil"
)

// getSysProcAttr returns process attributes to prevent console window popup on Windows
func getSysProcAttr() *syscall.SysProcAttr {
	return executil.GetSysProcAttr()
}
