import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols"
import {
  Type,
  Key,
  Ref,
  Props,
  ReactElement,
  ElementType,
} from "shared/ReactTypes"

// 创建 React 元素
const createElement = function (
  type: Type,
  key: Key,
  ref: Ref,
  props: Props
): ReactElement {
  const element = {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref,
    props,
    __mark: "wyl",
  }
  return element
}

// babel 将 jsx 语法 转换 执行jsx()  最终返回一个 ReactElement
export const jsx = (type: ElementType, config: any, ...maybeChildren: any) => {
  let key: Key = null
  const props: Props = {}
  let ref: Ref = null

  // 处理 props  ** key ref
  for (const prop in config) {
    const val = config[prop]
    if (prop === "key") {
      if (val !== undefined) {
        key = "" + val
      }
      continue
    }
    if (prop === "ref") {
      if (val !== undefined) {
        ref = val
      }
      continue
    }
    if (Object.hasOwnProperty.call(config, prop)) {
      props[prop] = val
    }
  }

  // 处理children
  const maybeChildrenLength = maybeChildren.length
  if (maybeChildrenLength) {
    if (maybeChildrenLength === 1) {
      props.children = maybeChildren[0]
    } else {
      props.children = maybeChildren
    }
  }

  return createElement(type, key, ref, props)
}

export const jsxDEV = (type: ElementType, config: any, maybeKey: any) => {
  let key: Key = null
  const props: Props = {}
  let ref: Ref = null
  if (maybeKey) key = maybeKey + ''
  // 处理 props  ** key ref
  for (const prop in config) {
    const val = config[prop]
    if (prop === "key") {
      if (val !== undefined) {
        key = "" + val
      }
      continue
    }
    if (prop === "ref") {
      if (val !== undefined) {
        ref = val
      }
      continue
    }
    if (Object.hasOwnProperty.call(config, prop)) {
      props[prop] = val
    }
  }

  return createElement(type, key, ref, props)
}

export function isValidElement(object: any) {
  return (
    typeof object === "object" &&
    object !== null &&
    object.$$typeof === REACT_ELEMENT_TYPE
  )
}
