import { pinyin } from 'pinyin-pro'
import type { ApiTreeListResData, PathApiDetail, ApiDetailListData } from '../types'

export const firstToLocaleUpperCase = (str: string | null | undefined): string => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export const cnToPinyin = (cn: string): string => {
  const pyArr = pinyin(cn, { toneType: 'none', type: 'array' })
  let isFirstOne = true
  const pyArr2 = pyArr.map((item) => {
    if (isFirstOne) {
      isFirstOne = false
      return item
    }
    if (item === '/') {
      isFirstOne = true
    }
    return firstToLocaleUpperCase(item)
  })
  return pyArr2
    .join('')
    .replace(/\s/g, '')
    .replace(/，/g, ',')
    .replace(/。/g, '.')
    .replace(/？/g, '?')
    .replace(/！/g, '!')
    .replace(/：/g, ':')
    .replace(/；/g, ';')
    .replace(/"/g, '"')
    .replace(/"/g, '"')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/……/g, '...')
    .replace(/《/g, '<')
    .replace(/》/g, '>')
    .replace(/%/g, '')
}

export function findSubtreePath(
  tree: ApiTreeListResData[],
  targetKey: string
): ApiTreeListResData | null {
  function dfs(node: ApiTreeListResData): ApiTreeListResData | null {
    if (node.key === targetKey) {
      return { ...node }
    }
    for (const child of node.children) {
      const result = dfs(child)
      if (result) {
        return { ...node, children: [result] }
      }
    }
    return null
  }
  for (const root of tree) {
    const result = dfs(root)
    if (result) return result
  }
  return null
}

export function getPathsAndApiDetails(
  tree: ApiTreeListResData | null,
  key: string,
  rootName: string
): PathApiDetail[] {
  if (!tree) return []

  const results: PathApiDetail[] = []

  function collectLastApiDetailsFolder(
    folderNode: ApiTreeListResData,
    basePath: string[],
    baseKeyArr: string[]
  ) {
    const apis: ApiDetailListData[] = []
    folderNode.children.forEach((child) => {
      if (child.type === 'apiDetail' && child.api) {
        apis.push(child.api as unknown as ApiDetailListData)
      } else if (child.type === 'apiDetailFolder') {
        collectLastApiDetailsFolder(
          child,
          [...basePath, cnToPinyin(child.name)],
          [...baseKeyArr, child.key]
        )
      }
    })
    if (apis.length > 0) {
      results.push({
        pathArr: basePath,
        api: apis as any,
        keyArr: baseKeyArr,
        path: basePath.join('/'),
      })
    }
  }

  function dfs(
    node: ApiTreeListResData,
    currentPath: string[],
    keyArr: string[],
    targetKey: string
  ): boolean {
    const nodeName = cnToPinyin(node.name)
    if (node.type === 'apiDetailFolder') {
      currentPath.push(nodeName)
      keyArr.push(node.key)
    }
    if (node.key === targetKey) {
      if (node.type === 'apiDetailFolder') {
        collectLastApiDetailsFolder(node, currentPath.slice(), keyArr.slice())
      } else if (node.type === 'apiDetail' && node.api) {
        results.push({
          pathArr: currentPath,
          api: [node.api] as any,
          keyArr,
          path: currentPath.join('/'),
        })
      }
      return true
    }
    for (const child of node.children) {
      if (dfs(child, currentPath, keyArr, targetKey)) return true
    }
    if (node.type === 'apiDetailFolder') {
      currentPath.pop()
      keyArr.pop()
    }
    return false
  }

  dfs(tree, [rootName], [], key)
  return results
}
