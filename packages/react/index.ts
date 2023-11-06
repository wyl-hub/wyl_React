import { Dispatcher, resolveDispatcher } from "./src/currentDispatcher"
import currentDispatcher from "./src/currentDispatcher"
import { jsxDEV, jsx, isValidElement as isValidElementFn } from "./src/jsx"
export type { Dispatch } from './src/currentDispatcher'

export const useState: Dispatcher["useState"] = initialState => {
  const dispatcher = resolveDispatcher()
  return dispatcher.useState(initialState)
}

// 内部数据共享层
export const XXXX = {
  currentDispatcher
}

export const version = '0.0.0'
export const createElement = jsx
export const isValidElement = isValidElementFn