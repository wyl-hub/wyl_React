import internals from "shared/internals"
import { FiberNode } from "./fiber"
import { Dispatcher } from "react/src/currentDispatcher"
import { Dispatch } from "react"
import {
  UpdateQueue,
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
  processUpdateQueue,
} from "./updateQueue"
import { Action } from "shared/ReactTypes"
import { scheduleUpdateOnFiber } from "./workLoop"

let currentlyRenderingFiber: FiberNode | null = null
let workInProgressHook: Hook | null = null
let currentHook: Hook | null = null

const { currentDispatcher } = internals

interface Hook {
  memoizedState: any
  updateQueue: unknown
  next: Hook | null
}

export function renderWithHooks(wip: FiberNode) {
  // 赋值操作
  currentlyRenderingFiber = wip
  // hook 链表 初始化
  wip.memoizedState = null

  console.log("currentlyRenderingFiber", currentlyRenderingFiber)
  const current = wip.alternate
  if (current !== null) {
    // update
    currentDispatcher.current = HooksDispatcherOnUpdate
  } else {
    // mount
    // mount 时 hooks 的具体实现
    currentDispatcher.current = HooksDispatcherOnMount
  }

  const Component = wip.type
  const props = wip.pendingProps
  const children = Component(props)

  // 重置操作
  currentlyRenderingFiber = null
  return children
}

const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState,
}

const HooksDispatcherOnUpdate: Dispatcher = {
  useState: updateState,
}

function mountState<State>(
  initialState: State | (() => State)
): [State, Dispatch<State>] {
  // 找到当前useState 对应的hook
  const hook = mountWorkInProgressHook()
  let memoizedState
  if (initialState instanceof Function) {
    memoizedState = initialState()
  } else {
    memoizedState = initialState
  }

  const queue = createUpdateQueue<State>()
  hook.updateQueue = queue
  hook.memoizedState = memoizedState
  // @ts-ignore
  const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue)
  queue.dispatch = dispatch
  return [memoizedState, dispatch]
}

function dispatchSetState<State>(
  fiber: FiberNode,
  updateQueue: UpdateQueue<State>,
  action: Action<State>
) {
  const update = createUpdate(action)
  enqueueUpdate(updateQueue, update)
  scheduleUpdateOnFiber(fiber)
}

function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,
    updateQueue: null,
    next: null,
  }
  if (workInProgressHook === null) {
    // 第一个hook
    if (currentlyRenderingFiber === null) {
      throw new Error("请在函数组件内执行hook")
    } else {
      workInProgressHook = hook
      // 构建hook链表的第一个hook
      currentlyRenderingFiber.memoizedState = workInProgressHook
    }
  } else {
    // 后续hook
    workInProgressHook = workInProgressHook.next = hook
  }
  return workInProgressHook
}

function updateState<State>(): [State, Dispatch<State>] {
  // 找到当前useState 对应的hook
  const hook = updateWorkInProgressHook()

  const queue = hook.updateQueue as UpdateQueue<State>
  const pending = queue.shared.pending

  if (pending !== null) {
    const { memoizedState } = processUpdateQueue(hook.memoizedState, pending)
    hook.memoizedState = memoizedState
  }

  return [hook.memoizedState, queue.dispatch as Dispatch<State>]
}

function updateWorkInProgressHook(): Hook {
  let nextCurrentHook: Hook | null
  if (currentHook === null) {
    // 此 FC update时第一个hook
    const current = currentlyRenderingFiber?.alternate
    if (current !== null) {
      nextCurrentHook = current?.memoizedState
    } else {
      // mount  (按道理不应该出现在此处)
      nextCurrentHook = null
    }
  } else {
    // 这个FC update时 后续的hook
    nextCurrentHook = currentHook.next
  }

  if (nextCurrentHook === null) {
    console.log("error", currentlyRenderingFiber)
    throw new Error("本次执行的hook 比 上次 hook 多")
  }

  currentHook = nextCurrentHook as Hook
  const newHook: Hook = {
    memoizedState: currentHook.memoizedState,
    updateQueue: currentHook.updateQueue,
    next: null,
  }

  if (workInProgressHook === null) {
    // 第一个hook
    if (currentlyRenderingFiber === null) {
      throw new Error("请在函数组件内执行hook")
    } else {
      workInProgressHook = newHook
      // 构建hook链表的第一个hook
      currentlyRenderingFiber.memoizedState = workInProgressHook
    }
  } else {
    // 后续hook
    workInProgressHook = workInProgressHook.next = newHook
  }
  return workInProgressHook
}
