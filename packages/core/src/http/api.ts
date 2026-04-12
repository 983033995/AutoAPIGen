import axios, { AxiosInstance } from 'axios'
import type { GetModelOptionsParams } from '../types'

const getModelOptions = (config: GetModelOptionsParams) => {
  const options = {
    apifox: {
      baseURL: 'https://api.apifox.cn/api/v1',
      headers: {
        ...(config.Authorization && { Authorization: config.Authorization }),
        ...(config.Cookie && { Cookie: config.Cookie }),
        Accept: '*/*',
        'Accept-Language': 'en-US',
        'Access-Control-Allow-Origin': '*',
        Origin: 'https://app.apifox.com',
        Referer: 'https://app.apifox.com/',
        'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Microsoft Edge";v="126"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
        'X-Client-Mode': 'web',
        'X-Client-Version': '2.5.34-alpha.3',
        'X-Device-Id': 'd13e6f9d-5193-4c5c-99db-97a4688def4b',
        'X-Project-Id': `${config.projectId || ''}`,
        ...(config.Cookie && {
          'Accept-Language': 'zh-CN',
          'X-Branch-Id': `${config.branchId || ''}`,
          'X-Client-Version': '2.7.45-alpha.3',
          'X-Device-Id': 'maBUD7MS-Yn8V-II9l-H5KE-6i83tr7XQt0w',
          'Sec-Fetch-Site': 'same-site',
        }),
        ...(config.Authorization && {
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
          Host: 'api.apifox.cn',
          Pragma: 'no-cache',
        }),
      },
    },
    postman: {
      baseURL: 'https://api.apifox.cn/api/v1',
      headers: {},
    },
    apipost: {
      baseURL: 'https://workspace.apipost.net/api',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Apipost-Token': `${config.Authorization || ''}`,
        'Apipost-Version': '8.0.15',
        'Content-Type': 'application/json',
        Origin: 'https://workspace.apipost.net',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      },
    },
  }
  return options[config.appName as keyof typeof options] || options.apifox
}

export const createApiClient = (config: GetModelOptionsParams): AxiosInstance => {
  const { baseURL, headers } = getModelOptions(config)
  const instance = axios.create({
    baseURL,
    timeout: 30 * 1000,
    headers: {
      ...headers,
      ...(config?.headers || {}),
    },
  })

  instance.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error)
  )
  return instance
}
