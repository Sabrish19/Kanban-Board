import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import KanbanBoard from './KanbanBoard'

function App() {

  return (
    <div>
      <h1 style={{textAlign:'center'}}>Kanban Board</h1>
      <KanbanBoardWrapper />
    </div>
  )
}

export default App
