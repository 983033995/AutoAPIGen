/*
 * @FilePath: /AutoAPIGen/src/core/http/api.ts
 * @Description: 
 */
import axios from 'axios'

/**
 * 获取模型选项
 *
 * @param config 获取模型选项的参数
 * @returns 返回对应应用名的模型选项
 */
const getModelOptions = (config: GetModelOptionsParams) => {
    console.log('----->getModelOptions', config)
    const options = {
        apifox: {
            baseURL: 'https://api.apifox.cn/api/v1',
            headers: {
                Authorization: config.Authorization,
                Accept: '*/*',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US',
                'Access-Control-Allow-Origin': '*',
                Connection: 'keep-alive',
                Host: 'api.apifox.cn',
                Origin: 'https://app.apifox.com',
                Pragma: 'no-cache',
                Referer: 'https://app.apifox.com/',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'cross-site',
                'User-Agent':
                  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
                'X-Client-Mode': 'web',
                'X-Client-Version': '2.5.34-alpha.3',
                'X-Device-Id': 'd13e6f9d-5193-4c5c-99db-97a4688def4b',
                'X-Project-Id': `${config.projectId || ''}`,
                'sec-ch-ua':
                  '"Google Chrome";v="113", "Chromium";v="113", "Not-A.Brand";v="24"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
            }
        },
        postman: {
            baseURL: 'https://api.apifox.cn/api/v1',
            headers: {
    
            }
        },
        apipost: {
            baseURL: 'https://workspace.apipost.net/api',
            headers: {
                "Accept": "application/json, text/plain, */*",
                "Accept-Encoding": "gzip, deflate, br, zstd",
                "Accept-Language": "zh-CN,zh;q=0.9",
                "Apipost-Language": "zh-cn",
                "Apipost-Machine": "14ddc7f75b000",
                "Apipost-Platform": "Mac",
                "Apipost-Terminal": "web",
                "Apipost-Token": `${config.Authorization || ''}`,
                "Apipost-Version": "8.0.15",
                "Content-Type": "application/json",
                "Origin": "https://workspace.apipost.net",
                "Priority": "u=1, i",
                "Referer": "https://workspace.apipost.net/2c1524504464000/apis",
                "Sec-Ch-Ua": '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": "macOS",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            }
        }
    }
    return options[config.appName]
}

export const api = (config: GetModelOptionsParams) => {
    const { baseURL, headers } = getModelOptions(config)
    const instance = axios.create({
        baseURL,
        timeout: 30 * 1000,
        headers: {
            ...headers,
            ...(config?.headers || {})
        }
    })

    // 添加请求拦截器
    instance.interceptors.response.use(
        function (response) {
            // 2xx 范围内的状态码都会触发该函数。
            // 对响应数据做点什么
            console.log('----->req', response)
            return response;
          }, function (error) {
            // 超出 2xx 范围的状态码都会触发该函数。
            // 对响应错误做点什么
            console.log('----->req--err', error)
            return Promise.reject(error);
          }
    )
    return instance
}