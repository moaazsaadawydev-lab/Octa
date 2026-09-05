//go:build windows
// +build windows

package executil

import "syscall"

// GetSysProcAttr returns process attributes to prevent console window popup on Windows.
func GetSysProcAttr() *syscall.SysProcAttr {
	return &syscall.SysProcAttr{
		HideWindow:    true,
		CreationFlags: 0x08000000, // CREATE_NO_WINDOW
	}
}
