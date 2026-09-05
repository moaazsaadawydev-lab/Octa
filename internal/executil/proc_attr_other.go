//go:build !windows
// +build !windows

package executil

import "syscall"

// GetSysProcAttr returns standard process attributes on non-Windows platforms.
func GetSysProcAttr() *syscall.SysProcAttr {
	return &syscall.SysProcAttr{}
}
