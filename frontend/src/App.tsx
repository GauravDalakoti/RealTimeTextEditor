import './App.css'
import CollaborativeEditor from './components/Editor'
import "./index.css"
import { Toaster } from 'react-hot-toast'

function App() {

  return (
    <>
      <Toaster position="top-center"
      >

      </Toaster>
      <CollaborativeEditor />
    </>
  )
}

export default App
