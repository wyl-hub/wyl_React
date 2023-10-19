import { createInstance } from "hostConfig"
import { FiberNode } from "./fiber"
import { HostComponent, HostRoot, HostText } from "./workTags"

// 构建离屏 DOM树
export function completeWork(wip: FiberNode) {
  const newProps = wip.pendingProps
  const current = wip.alternate
  switch (wip.tag) {
    case HostComponent: {
      // update
      if (current !== null && wip.stateNode) {
      } else {
        // mount
        // 1. 构建DOM
        const instance = createInstance(wip.type, newProps)
        // 2. 将DOM插入DOM树中
        appendAllChildren(instance, wip)
        wip.stateNode = instance
      }
      return null
    }
    case HostText: {
      // update
      if (current !== null && wip.stateNode) {
      } else {
        // mount
        // 1. 构建DOM
        const instance = createInstance(newProps.content)
        wip.stateNode = instance
      }
      return null
    }
    case HostRoot:
      return null
    default:
      console.log("未处理的completeWork 类型", wip)
      break
  }
}

function appendAllChildren(instance: Element, wip: FiberNode) {
  let node = wip.child

  while (node !== null) {
    // 从wipfiber 向 子fiber查找 找到第一个 DOM类型的fiber 插入到当前fiber DOM节点下
    if (node.tag === HostComponent || node.tag === HostText) {
      // 插入DOM
    } else if (node.child !== null) {
      // 继续向下查找
      node.child.return = node
      node = node.child
      continue
    }

    if (node === wip) return
    // 代表 wip 的大儿子 DOM 成功插入  现在找他的剩余儿子
    while (node.sibling === null) {
      if (node.return === null || node.return === wip) return
      // 大儿子和其他儿子的fiber不一定在同一层
      // <div>                A = <div></div>
      //   <A />
      //   <p></p>
      // </div>

      // 例如  大儿子的 fiber 为  组件A fiber 的 child   所以 node.sibling === null
      // 于是 向上回溯 找到 A 的 fiber 时  Afiber.sibling  ===  pfiber
      // 找sibling的这一套操作 会将 wip 的 大儿子 到 wip  fiber 之间的所有 子节点 全部插入到 wip DOM 下(包括大儿子的sibling)

      // <div>                A = <div></div>
      //   <A />
      //   <B />              B = <div></div>
      // </div>

      node = node?.return
    }
    node.sibling.return = node.return
    node = node.sibling
  }
}
