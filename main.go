package main

import (
	"embed"
	"os"
	"runtime/debug"
	"time"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// 1. Optimize WebView2 resource usage & memory footprint
	existingArgs := os.Getenv("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS")
	resourceFlags := "--disable-background-networking --disable-component-update --disable-features=Translate,InterestFeedContentSuggestions --enable-features=IntensiveWakeUpThrottling,ThrottleDisplayNoneAndVisibilityHiddenCrossOriginIframes"
	if existingArgs != "" {
		_ = os.Setenv("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", existingArgs+" "+resourceFlags)
	} else {
		_ = os.Setenv("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", resourceFlags)
	}

	// 2. Tune Go GC for desktop responsiveness and minimal idle RAM usage
	debug.SetGCPercent(40)
	debug.SetMemoryLimit(200 * 1024 * 1024)

	// 3. Periodic idle memory trimmer releasing unused pages to the Windows kernel
	go func() {
		ticker := time.NewTicker(2 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			debug.FreeOSMemory()
		}
	}()

	// Create an instance of the app structure
	app := NewApp()

	// Create application with options
	err := wails.Run(&options.App{
		Title:            "Octa",
		Width:            1280,
		Height:           800,
		MinWidth:         1024,
		MinHeight:        680,
		WindowStartState: options.Maximised,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 9, G: 10, B: 15, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
		Windows: &windows.Options{
			ResizeDebounceMS: 20,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}

