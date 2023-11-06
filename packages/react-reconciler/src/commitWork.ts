import { Container, appendChildToContainer, commitUpdate, removeChild } from "hostConfig"
import { FiberNode, FiberRootNode } from "./fiber"
import {
  ChildDeletion,
  MutationMask,
  NoFlags,
  Placement,
  Update,
} from "./fiberFlags"
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from "./workTags"

let nextEffect: FiberNode | null = null
export const commitMutationEffects = (finishedWork: FiberNode) => {
  console.log("commitMutationEffects", finishedWork)
  nextEffect = finishedWork
  while (nextEffect !== null) {
    const child: FiberNode | null = nextEffect.child
    if (
      (nextEffect.subtreeFlags & MutationMask) !== NoFlags &&
      child !== null
    ) {
      nextEffect = child
    } else {
      up: while (nextEffect !== null) {
        commitMutationEffectsOnFiber(nextEffect)
        const sibling: FiberNode | null = nextEffect.sibling
        if (sibling !== null) {
          nextEffect = sibling
          break up
        }
        nextEffect = nextEffect.return
      }
    }
  }
}

const commitMutationEffectsOnFiber = (finishedWork: FiberNode) => {
  const flags = finishedWork.flags

  // Placement
  if ((flags & Placement) !== NoFlags) {
    commitPlacement(finishedWork)
    finishedWork.flags &= ~Placement
  }
  // Update
  if ((flags & Update) !== NoFlags) {
    commitUpdate(finishedWork)
    finishedWork.flags &= ~Update
  }
  // ChildDeletion
  if ((flags & ChildDeletion) !== NoFlags) {
    const deletions = finishedWork.deletions
    if (deletions !== null) {
      deletions.forEach((childToDelete) => {
        commitDeletion(childToDelete)
      })
    }
    commitUpdate(finishedWork)
    finishedWork.flags &= ~ChildDeletion
  }
}

function commitDeletion(childToDelete: FiberNode) {
  let rootHostNode: FiberNode | null = null
  // 递归子树
  commitNestedComponent(childToDelete, (unmountFiber) => {
    switch (unmountFiber.tag) {
      case HostComponent:
        if (rootHostNode === null) {
          rootHostNode = unmountFiber
        }
        // 解绑ref
        return
      case HostText:
        if (rootHostNode === null) {
          rootHostNode = unmountFiber
        }
        return
      case FunctionComponent:
        // useEffect unmount
        return
      default:
        console.log("未处理的unmount类型", unmountFiber)
    }
  })
  // 移除 rootHostNode 的 DOM
  if (rootHostNode !== null) {
    const hostParent = getHostParent(rootHostNode)
    if (hostParent !== null) {
      removeChild(rootHostNode, hostParent)
    }
  }
  childToDelete.return = null
  childToDelete.child = null
}

function commitNestedComponent(
  root: FiberNode,
  onCommitUnmount: (fiber: FiberNode) => void
) {
  let node = root
  while (true) {
    onCommitUnmount(node)

    if (node.child !== null) {
      node.child.return = node
      node = node.child
      continue
    }

    if (node === root) return

    // 向上归
    while (node.sibling === null) {
      if (node.return === null || node.return === root) return
      node = node.return
    }
    node.sibling.return = node.return
    node = node.sibling
  }
}

const commitPlacement = (finishedWork: FiberNode) => {
  console.log("执行 Placement")
  const hostParent = getHostParent(finishedWork)
  if (hostParent !== null) {
    appendPlacementNodeIntoContainer(finishedWork, hostParent)
  }
}

// 获取父级DOM类型的fiber
function getHostParent(fiber: FiberNode) {
  let parent = fiber.return
  while (parent) {
    const parentTag = parent.tag
    if (parentTag === HostComponent) {
      return parent.stateNode
    }
    if (parentTag === HostRoot) {
      return (parent.stateNode as FiberRootNode).container
    }
    parent = parent.return
  }

  console.log("没有找到父级DOM fiber", fiber)
  return null
}

function appendPlacementNodeIntoContainer(
  finishedWork: FiberNode,
  hostParent: Container
) {
  if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
    appendChildToContainer(hostParent, finishedWork.stateNode)
    return
  }
  const child = finishedWork.child
  if (child !== null) {
    appendPlacementNodeIntoContainer(child, hostParent)
    let sibling = child.sibling
    while (sibling !== null) {
      appendPlacementNodeIntoContainer(sibling, hostParent)
      sibling = sibling.sibling
    }
  }
}
