/*
 * @FilePath: /AutoAPIGen/src/core/template/env.config.ts
 * @Description: 
 */
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
