import { FiberNode, FiberRootNode, createWorkInProgress } from "./fiber"
import { beginWork } from "./beginWork"
import { completeWork } from "./completeWork"
import { HostRoot } from "./workTags"
import { MutationMask, NoFlags } from "./fiberFlags"
import { commitMutationEffects } from "./commitWork"
import { Lane, NoLane, SyncLane, getHighestPriorityLane, markRootFinished, mergeLanes } from "./fiberLanes"
import { flushSyncCallback, scheduleSyncCallback } from "./syncTaskQueue"
import { scheduleMicroTask } from "hostConfig"
let workInProgress: FiberNode | null = null
let wipRootRenderLane: Lane = NoLane

function prepareFreshStack(root: FiberRootNode, lane: Lane) {
  workInProgress = createWorkInProgress(root.current, {})
  wipRootRenderLane = lane
}

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
  // 调度功能
  // 获取 fiberRootNode
  const root = markUpdateFromFiberToRoot(fiber)
  markRootUpdated(root, lane)
  ensureRootIsScheduled(root)
}

// schedule 入口
function ensureRootIsScheduled(root: FiberRootNode) {
  const updateLane = getHighestPriorityLane(root.pendingLanes)
  // 每次更新会 scheduleUpdateOnFiber
  // 每次创建更新都会申请 lane
  // 没有 lane 代表更新执行完 所以 不需要继续schedule
  if (updateLane === NoLane) {
    return
  }
  if (updateLane === SyncLane) {
    // 同步优先级 微任务调度
    console.log('在微任务中调度 优先级:', updateLane)
    // 构造更新 数组
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane))
    scheduleMicroTask(flushSyncCallback)
  } else {
    // 其他优先级 宏任务调度
  }
}

function markRootUpdated(root: FiberRootNode, lane: Lane) {
  root.pendingLanes = mergeLanes(root.pendingLanes, lane)
}

function markUpdateFromFiberToRoot(fiber: FiberNode) {
  let node = fiber
  let parent = fiber.return
  while (parent !== null) {
    node = parent
    parent = node.return
  }
  if (node.tag === HostRoot) {
    return node.stateNode
  }
  return null
}

function performSyncWorkOnRoot(root: FiberRootNode, lane: Lane) {
  const nextLane = getHighestPriorityLane(root.pendingLanes)
  if (nextLane !== SyncLane) {
    ensureRootIsScheduled(root)
    return
  }
  // 创建 调度 开始的 workInProgress (双缓存 fiber树)
  prepareFreshStack(root, lane)
  do {
    try {
      workLoop()
      break
    } catch (e) {
      console.warn("workLoop 发生错误", e)
      workInProgress = null
    }
  } while (true)

  const finishedWork = root.current.alternate
  root.finishedWork = finishedWork
  root.finishedLane = lane
  wipRootRenderLane = NoLane
  // wip fiberNode 树  中的flags
  commitRoot(root)
}

function commitRoot(root: FiberRootNode) {
  console.log('commitRoot')
  const finishedWork = root.finishedWork

  if (finishedWork === null) return

  const lane = root.finishedLane
  if (lane === NoLane) {
    console.error('commit 阶段 lane 不应该为 NoLane')
  }

  // 重置
  root.finishedWork = null
  root.finishedLane = NoLane

  markRootFinished(root, lane)
  // 判断是否存在3个阶段需要执行的操作
  // root flags  subtreeFlags
  const subtreeHasEffect =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags
  const rootHasEffect = (finishedWork.subtreeFlags & MutationMask) !== NoFlags

  if (subtreeHasEffect || rootHasEffect) {
    // beforeMutation
    // mutation
    commitMutationEffects(finishedWork)
    // layout
    root.current = finishedWork
  } else {
    root.current = finishedWork
  }
}

function workLoop() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}

function performUnitOfWork(fiber: FiberNode) {
  // 从头 至尾  构建每一个节点的fiber节点 并计算最新属性
  const next = beginWork(fiber, wipRootRenderLane)
  fiber.memoizedProps = fiber.pendingProps
  
  if (next === null) {
    // 完成该节点 创建该fiber的DOM节点 并构建一条 离屏DOM树
    // 完成该节点后 继续创建该节点的兄弟节点 若已不存在兄弟节点 向上回溯
    completeUnitOfWork(fiber)
  } else {
    workInProgress = next
  }
}

function completeUnitOfWork(fiber: FiberNode) {
  let node: FiberNode | null = fiber

  do {
    completeWork(node)
    const sibling = node.sibling
    if (sibling !== null) {
      workInProgress = sibling
      return
    }
    node = node.return
    workInProgress = node
  } while (node !== null)
}
