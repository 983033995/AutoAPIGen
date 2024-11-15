export const envConfig = `
const envConf: ExpandRecursively<IEnvConfig> = {
    // 开发环境
    develop: {
        MODE: 'dev', // 开发环境
        SERVER_URL: 'https://test-app-go-api.galaxy-immi.com', // 服务器地址
        UPLOAD_SERVER: 'https://test-comserver.galaxy-immi.com', // 上传服务器
    },
    // 测试环境
    trial: {
        MODE: 'test',
        SERVER_URL: 'https://test-app-go-api.galaxy-immi.com',
        UPLOAD_SERVER: 'https://test-comserver.galaxy-immi.com',
    },
    // 线上环境
    release: {
        MODE: 'prod',
        SERVER_URL: 'https://app-go-api.galaxy-immi.com',
        UPLOAD_SERVER: 'https://comserver.galaxy-immi.com',
    }
}

// @ts-ignore
const currentEnv = (__wxConfig as __WxConfig).envVersion
export const env: Expand<EnvConfigItem<typeof currentEnv>> = envConf[currentEnv]
`

export const interfaceDefinition = `
/**
 * 用于完整展开类型，浮动的时候显示所有类型细节，方便查看
 * https://zhuanlan.zhihu.com/p/339577453
 */
type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

/**
 * 用于完整展开类型，浮动的时候显示所有类型细节，方便查看
 * https://zhuanlan.zhihu.com/p/339577453
 */
type ExpandRecursively<T> = T extends object
  ? T extends infer O ? { [K in keyof O]: ExpandRecursively<O[K]> } : never
  : T;

/**
 * 将一个对象中的某些选项变为可选的对象类型。
 * @template T - 原始对象类型
 * @template K - 属性的子集
 * @eg partialOption<{name: string, age: number}, 'name'}> => {name?: string, age: number}
 */
type partialOption<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

interface __WxConfig {
  envVersion: 'develop' | 'trial' | 'release'
}

interface IEnvModel {
  develop: 'dev'
  trial: 'test'
  release: 'prod'
}
interface EnvConfigItem<T extends keyof IEnvModel> {
  MODE: IEnvModel[T]
  SERVER_URL: string
  UPLOAD_SERVER: string
}

type IEnvConfig = {
  [K in keyof IEnvModel]: EnvConfigItem<K>
}

/**
 * @description: HTTP请求配置
*/
interface RequestConfig extends Omit<WechatMiniprogram.RequestOption, 'success' | 'fail' | 'complete'> {
    /** 无TOKEN触发异常捕获时，是否执行异常逻辑 */
    needToken?: boolean
    /** 请求报错时，是否弹出message提示（默认弹出）*/
    noShowMsg?: boolean
    // 是否展示loading
    loading?: boolean
}

/**
 * @description: 声明业务数据类型
*/
interface ResponseData<T> {
    code: number
    msg: string
    data: T
}
interface MyResData<T> extends WechatMiniprogram.RequestSuccessCallbackResult {
    data: ResponseData<T>
}

interface OtherRequestConfig extends Omit<RequestConfig, 'url' | 'data' | 'method'> {
    // 是否需要序列化参数
    urlParse?: boolean
}
`

export const apiRequest = `
import { env } from './env.config'
import qs from 'qs'

enum HttpMethod {
    'GET' = 'GET',
    'POST' = 'POST',
    'DELETE' = 'DELETE',
    'PUT' = 'PUT',
    'OPTIONS' = 'OPTIONS',
    'HEAD' = 'HEAD',
    'TRACE' = 'TRACE',
    'CONNECT' = 'CONNECT',
}

// 使用 Set 以提高查找效率
const loadingWhiteList = new Set<string>()

class HttpRequest {
    private static instance: HttpRequest
    private loadingCount: number = 0

    private constructor() { }

    /** 单例模式，获取 HttpRequest 实例 */
    public static getInstance(): HttpRequest {
        if (!this.instance) {
            this.instance = new HttpRequest()
        }
        return this.instance
    }

    /** 添加 URL 到 loadingWhiteList */
    public addToLoadingWhiteList(url: string) {
        loadingWhiteList.add(url)
    }

    /** 从 loadingWhiteList 移除 URL */
    public removeFromLoadingWhiteList(url: string) {
        loadingWhiteList.delete(url)
    }

    // 处理请求状态码异常
    private handleErrorStatus(statusCode: number, requestConfig: RequestConfig, message: string) {
        let msg = message || '服务不可用'
        if (statusCode === 502 || statusCode === 503) {
            msg = '服务器暂时不可用'
        }
        if (!requestConfig.noShowMsg) {
            wx.showToast({ title: msg, icon: 'none', duration: 3000 })
        }
        return msg
    }

    // 处理请求错误
    private handleError(err: { errMsg: string }, requestConfig: RequestConfig) {
        let msg = '请求出错'
        if (/timeout/.test(err.errMsg)) {
            msg = '请求超时'
        }
        if (!requestConfig.noShowMsg) {
            wx.showToast({ title: msg, icon: 'none' })
        }
        return msg
    }

    // 发起服务器请求
    public request<T>(requestConfig: ExpandRecursively<RequestConfig>): Promise<ExpandRecursively<T>> {
        const header = this.getDefaultHeaders(requestConfig)

        if (this.shouldShowLoading(requestConfig)) {
            this.showLoading()
        }

        const url = this.formatUrl(requestConfig.url)

        return new Promise((resolve, reject) => {
            wx.request({
                method: requestConfig.method,
                url,
                data: requestConfig.data,
                header,
                dataType: requestConfig.dataType || 'json',
                success: (res: WechatMiniprogram.RequestSuccessCallbackResult<any>) => {
                    const response = res as unknown as ExpandRecursively<MyResData<T>>
                    this.handleSuccess(response, requestConfig, resolve, reject)
                  },
                fail: (err) => {
                    reject({ msg: this.handleError(err, requestConfig) })
                },
                complete: () => {
                    this.hideLoadingIfNecessary(requestConfig)
                }
            })
        })
    }

    // 根据环境和相对/绝对路径格式化 URL
    private formatUrl(url: string): string {
        return url.startsWith('http:') || url.startsWith('https:') ? url : \`\${env.SERVER_URL}\${url}\`;
    }

    // 根据请求方法设置默认 header
    private getDefaultHeaders(requestConfig: RequestConfig) {
        const contentType = requestConfig.method === HttpMethod.GET
            ? 'application/x-www-form-urlencoded'
            : 'application/json'
        return {
            'content-type': contentType,
            token: wx.getStorageSync('userInfo').token || '',
            ...requestConfig?.header
        }
    }

    // 判断是否需要显示 loading
    private shouldShowLoading(requestConfig: RequestConfig): boolean {
        return !loadingWhiteList.has(requestConfig.url) && !!requestConfig.loading
    }

    // 显示 loading，增加 loading 计数
    private showLoading() {
        this.loadingCount++
        if (this.loadingCount === 1) {
            wx.showLoading({ title: '加载中...', mask: true })
        }
    }

    // 当请求完成后隐藏 loading
    private hideLoadingIfNecessary(requestConfig: RequestConfig) {
        if (!this.shouldShowLoading(requestConfig)) return
        this.loadingCount = Math.max(0, this.loadingCount - 1)
        if (this.loadingCount === 0) {
            wx.hideLoading()
        }
    }

    // 处理请求成功的响应
    private handleSuccess<T>(
        res: ExpandRecursively<MyResData<T>>,
        requestConfig: RequestConfig,
        resolve: (value: ExpandRecursively<T>) => void,
        reject: (reason?: any) => void
    ) {
        const { statusCode = 404, data } = res
        if (statusCode === 200 && data && data.code === 200) {
            resolve(data.data as ExpandRecursively<T>)
        } else if (statusCode === 401) {
            this.handleUnauthorized(requestConfig, reject, data)
        } else if (data.code === 10010) {
            this.clearUserData()
            reject({ code: statusCode, msg: '登录信息已失效，请重新登录', data })
        } else {
            reject({ code: statusCode, msg: this.handleErrorStatus(statusCode, requestConfig, data.msg), data })
        }
    }

    // 处理 401 未授权错误
    private handleUnauthorized(requestConfig: RequestConfig, reject: Function, data: any) {
        if (!requestConfig.noShowMsg) {
            wx.showModal({
                title: '登录失效',
                content: '请重新登录',
            }).then((res) => {
                if (res.confirm) {
                    // 添加重新登录逻辑
                }
            })
        }
        reject({ code: 401, msg: '未授权', data })
    }

    // 登录信息失效时清除用户数据
    private clearUserData() {
        wx.removeStorageSync('userInfo')
    }

    public get<T>(url: string, data?: object, otherConfig?: Expand<OtherRequestConfig>) {
        const finalUrl = otherConfig?.urlParse 
            ? \`\${url}?\${qs.stringify(data, { arrayFormat: 'indices' })}\` 
            : url;
        return this.request<T>({
            method: HttpMethod.GET,
            url: finalUrl,
            data: otherConfig?.urlParse ? {} : data,
            ...otherConfig
        });
    }

    public post<T>(url: string, data: object, otherConfig?: Expand<OtherRequestConfig>) {
        return this.request<T>({ method: HttpMethod.POST, url, data, ...otherConfig })
    }

    public delete<T>(url: string, data: object, otherConfig?: Expand<OtherRequestConfig>) {
        return this.request<T>({ method: HttpMethod.DELETE, url, data, ...otherConfig })
    }

    public put<T>(url: string, data?: object, otherConfig?: Expand<OtherRequestConfig>) {
        return this.request<T>({ method: HttpMethod.PUT, url, data, ...otherConfig })
    }

    public head<T>(url: string, otherConfig?: Expand<OtherRequestConfig>) {
        return this.request<T>({ method: HttpMethod.HEAD, url, ...otherConfig })
    }

    public options<T>(url: string, otherConfig?: Expand<OtherRequestConfig>) {
        return this.request<T>({ method: HttpMethod.OPTIONS, url, ...otherConfig })
    }
}

export const http = HttpRequest.getInstance()
`