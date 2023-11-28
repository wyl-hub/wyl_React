import { Dispatch } from "react"
import { Action } from "shared/ReactTypes"
import { Lane } from "./fiberLanes"

export interface Update<State> {
  action: Action<State>
  lane: Lane
  next: Update<any> | null
}

export interface UpdateQueue<State> {
  shared: {
    pending: Update<State> | null
  }
  dispatch: Dispatch<State> | null
}

export const createUpdate = <State>(
  action: Action<State>,
  lane: Lane
): Update<State> => {
  return {
    action,
    lane,
    next: null,
  }
}

export const createUpdateQueue = <State>() => {
  return {
    shared: {
      pending: null,
    },
    dispatch: null,
  } as UpdateQueue<State>
}

// 循环链表
// updateQueue.shared.pending 指向的是最后一个 update
// updateQueue.shared.pending.next 指向第一个 update
export const enqueueUpdate = <State>(
  updateQueue: UpdateQueue<State>,
  update: Update<State>
) => {
  const pending = updateQueue.shared.pending
  if (pending === null) {
    update.next = update
  } else {
    update.next = pending.next
    pending.next = update
  }
  updateQueue.shared.pending = update
}

export const processUpdateQueue = <State>(
  baseState: State,
  pendingUpdate: Update<State> | null,
  renderLane: Lane
): { memoizedState: State | undefined } => {
  const result: ReturnType<typeof processUpdateQueue<State>> = {
    memoizedState: baseState,
  }
  if (pendingUpdate !== null) {
    let first = pendingUpdate.next
    let pending = pendingUpdate.next
    do {
      const updateLane = pending?.lane
      if (updateLane === renderLane) {
        const action = pendingUpdate?.action
        if (action) {
          if (action instanceof Function) {
            baseState = action(baseState)
          } else {
            baseState = action
          }
        }
      } else {
        console.log('优先级不一致的update')
      }
      pending = pending?.next as Update<any>
    } while (pending !== first)
  }
  result.memoizedState = baseState
  return result
}
