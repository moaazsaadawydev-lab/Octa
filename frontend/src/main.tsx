import React from 'react'
import {createRoot} from 'react-dom/client'
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import './style.css'
import App from './App'
import { ThemeProvider } from './context/ThemeContext'

// Ensure all Monaco instances use locally bundled monaco-editor package rather than fetching from CDN
loader.config({ monaco })


const container = document.getElementById('root')

const root = createRoot(container!)

root.render(
    <React.StrictMode>
        <ThemeProvider>
            <App/>
        </ThemeProvider>
    </React.StrictMode>
)
