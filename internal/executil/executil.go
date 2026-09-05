package executil

import (
	"context"
	"os/exec"
)

// Command creates an exec.Cmd configured with background/hidden process attributes to prevent console popups on Windows.
func Command(name string, args ...string) *exec.Cmd {
	cmd := exec.Command(name, args...)
	cmd.SysProcAttr = GetSysProcAttr()
	return cmd
}

// CommandContext creates an exec.Cmd with context, configured with background/hidden process attributes.
func CommandContext(ctx context.Context, name string, args ...string) *exec.Cmd {
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.SysProcAttr = GetSysProcAttr()
	return cmd
}
