//go:build windows
// +build windows

package main

import "syscall"

// getSysProcAttr returns process attributes to prevent console window popup on Windows
func getSysProcAttr() *syscall.SysProcAttr {
	return &syscall.SysProcAttr{
		HideWindow:    true,
		CreationFlags: 0x08000000, // CREATE_NO_WINDOW
	}
}
