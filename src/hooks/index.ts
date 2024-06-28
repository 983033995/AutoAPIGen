/*
 * @FilePath: /AutoAPIGen/src/hooks/index.ts
 * @Description: 
 */

const { t } = useI18n()

export const useGetConfig = () => {

    // 配置信息
    const configInfo = ref<ConfigurationInformation>()

    // 获取配置信息校验结果
    const checkConfigRes = computed(() => {
        if (!configInfo.value?.haveSetting) {
            return {
                success: false,
                type: 0,
                message: t('tip')
            }
        }
        const { app, Authorization } = configInfo.value.configInfo || {}

        if (!app || !Authorization) {
            return {
                success: false,
                type: 1,
                message: t('tip1')
            }
        }

        return {
            success: true,
            type: -1,
            message: ''
        }
    })

    return {
        configInfo,
        checkConfigRes
    }
}
