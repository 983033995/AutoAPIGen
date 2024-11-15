/*
 * @FilePath: /AutoAPIGen/src/core/template/index.d.ts
 * @Description: 
 */
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