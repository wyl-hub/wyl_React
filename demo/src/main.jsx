import React from "react"
import ReactDOM from "react-dom/client"

const App = () => {
  return (
    <div>
      <Child />
    </div>
  )
}

const Child = () => {
  return (
    <div>
      <h3>child</h3>
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById("root"))
root.render(<App />)
