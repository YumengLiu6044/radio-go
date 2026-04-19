import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { LibraryProvider } from './library/LibraryContext.tsx'
import { TopicsProvider } from './topics/TopicsContext.tsx'
import { CheatSheetsProvider } from './cheatSheets/CheatSheetsContext.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LibraryProvider>
      <TopicsProvider>
        <CheatSheetsProvider>
          <App />
        </CheatSheetsProvider>
      </TopicsProvider>
    </LibraryProvider>
  </StrictMode>,
)
