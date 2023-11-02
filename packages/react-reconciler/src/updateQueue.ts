import { Dispatch } from "react"
import { Action } from "shared/ReactTypes"

export interface Update<State> {
  action: Action<State>
}

export interface UpdateQueue<State> {
  shared: {
    pending: Update<State> | null
  },
  dispatch: Dispatch<State> | null
}

export const createUpdate = <State>(action: Action<State>): Update<State> => {
  return {
    action
  }
}

export const createUpdateQueue = <State>() => {
  return {
    shared: {
      pending: null
    },
    dispatch: null
  } as UpdateQueue<State>
}

export const enqueueUpdate = <State>(
  updateQueue: UpdateQueue<State>,
  update: Update<State>
) => {
  updateQueue.shared.pending = update
}

export const processUpdateQueue = <State>(
  baseState: State,
  pendingUpdate: Update<State> | null
): { memorizedState: State | undefined } => {
  const result: ReturnType<typeof processUpdateQueue<State>> = { memorizedState: baseState }
  const action = pendingUpdate?.action
  if (action instanceof Function) {
    result.memorizedState = action(baseState)
  } else {
    result.memorizedState = action
  }
  return result
}
