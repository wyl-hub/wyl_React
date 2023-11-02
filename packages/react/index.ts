import { Dispatcher, resolveDispatcher } from "./src/currentDispatcher"
import currentDispatcher from "./src/currentDispatcher"
import { jsxDEV } from "./src/jsx"

export const useState: Dispatcher["useState"] = initialState => {
  const dispatcher = resolveDispatcher()
  return dispatcher.useState(initialState)
}

// 内部数据共享层
export const XXXX = {
  currentDispatcher
}

export default {
  version: "0.0.0",
  createElement: jsxDEV,
}
