package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestResolveDefinition(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "octa-def-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	srcDir := filepath.Join(tmpDir, "src")
	if err := os.MkdirAll(srcDir, 0755); err != nil {
		t.Fatalf("Failed to create src dir: %v", err)
	}

	controllerContent := `import { Controller } from '@nestjs/common';

@Controller()
export class AppController {
  getHello(): string {
    return 'Hello World';
  }
}
`
	controllerPath := filepath.Join(srcDir, "app.controller.ts")
	_ = os.WriteFile(controllerPath, []byte(controllerContent), 0644)

	moduleContent := `import { Module } from '@nestjs/common';
import { AppController } from './app.controller';

@Module({
  controllers: [AppController],
})
export class AppModule {}
`
	modulePath := filepath.Join(srcDir, "app.module.ts")
	_ = os.WriteFile(modulePath, []byte(moduleContent), 0644)

	svc := NewEditorService()

	// Test A: Resolving AppController from inside AppModule controllers array
	loc, err := svc.ResolveDefinition(tmpDir, modulePath, "AppController", "  controllers: [AppController],")
	if err != nil || loc == nil {
		t.Fatalf("ResolveDefinition failed: %v, loc: %v", err, loc)
	}
	if filepath.Clean(loc.FullPath) != filepath.Clean(controllerPath) || loc.Line != 4 {
		t.Errorf("AppController failed: path=%s line=%d", loc.FullPath, loc.Line)
	}

	// Test B: Direct click on import path string './app.controller'
	locPath, err := svc.ResolveDefinition(tmpDir, modulePath, "./app.controller", "import { AppController } from './app.controller';")
	if err != nil || locPath == nil || filepath.Clean(locPath.FullPath) != filepath.Clean(controllerPath) {
		t.Errorf("Import path resolution failed: %v", locPath)
	}

	// Test C: Python from .service import AppService
	pyServiceContent := `class AppService:
    def get_hello(self):
        return "Hello Python"
`
	pyServicePath := filepath.Join(srcDir, "app_service.py")
	_ = os.WriteFile(pyServicePath, []byte(pyServiceContent), 0644)

	pyAppContent := `from .app_service import AppService
svc = AppService()
`
	pyAppPath := filepath.Join(srcDir, "app.py")
	_ = os.WriteFile(pyAppPath, []byte(pyAppContent), 0644)

	locPy, err := svc.ResolveDefinition(tmpDir, pyAppPath, "AppService", "svc = AppService()")
	if err != nil || locPy == nil || filepath.Clean(locPy.FullPath) != filepath.Clean(pyServicePath) {
		t.Errorf("Python AppService failed: %v", locPy)
	}

	// Test D: TSConfig paths + Multiline import + Re-export (SkillUp Nx pattern)
	libsDir := filepath.Join(tmpDir, "libs", "interfaces", "src")
	_ = os.MkdirAll(libsDir, 0755)

	targetInterfacePath := filepath.Join(libsDir, "users-grpc.interface.ts")
	_ = os.WriteFile(targetInterfacePath, []byte("export interface UsersServiceClient {\n  call(): void;\n}\n"), 0644)

	indexInterfacePath := filepath.Join(libsDir, "index.ts")
	_ = os.WriteFile(indexInterfacePath, []byte("export * from './users-grpc.interface';\n"), 0644)

	tsconfigContent := `{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@test/interfaces": ["libs/interfaces/src/index.ts"]
    }
  }
}`
	_ = os.WriteFile(filepath.Join(tmpDir, "tsconfig.base.json"), []byte(tsconfigContent), 0644)

	multilineCallerContent := `import {
  USERS_SERVICE_NAME,
  UsersServiceClient,
} from '@test/interfaces';

const client: UsersServiceClient = null;
`
	callerPath := filepath.Join(srcDir, "registration.provider.ts")
	_ = os.WriteFile(callerPath, []byte(multilineCallerContent), 0644)

	locMultiline, err := svc.ResolveDefinition(tmpDir, callerPath, "UsersServiceClient", "const client: UsersServiceClient = null;")
	if err != nil || locMultiline == nil {
		t.Fatalf("ResolveDefinition for multiline tsconfig failed: %v, loc: %v", err, locMultiline)
	}
	if filepath.Clean(locMultiline.FullPath) != filepath.Clean(targetInterfacePath) {
		t.Errorf("Expected target to be %s, got %s", targetInterfacePath, locMultiline.FullPath)
	}
	if locMultiline.Line != 1 {
		t.Errorf("Expected definition line 1, got %d", locMultiline.Line)
	}
}
