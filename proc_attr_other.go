//go:build !windows
// +build !windows

package main

import "syscall"

// getSysProcAttr returns standard process attributes on non-Windows platforms
func getSysProcAttr() *syscall.SysProcAttr {
	return &syscall.SysProcAttr{}
}
