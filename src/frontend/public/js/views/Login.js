import { ref } from 'vue'
import { useStore } from 'vuex'
import { useRouter, useRoute } from 'vue-router'

export default {
    template: `
        <div class="login-container" style="height: 100vh; display: flex; justify-content: center; align-items: center; background: #f0f2f5;">
            <a-card style="width: 400px; border-radius: 4px;">
                <template #title>
                    <div style="text-align: center; font-size: 24px; color: #1890ff;">
                        NodeConfig
                    </div>
                </template>
                
                <a-form
                    :model="formState"
                    @finish="handleSubmit"
                    layout="vertical"
                >
                    <a-form-item
                        label="用户名"
                        name="username"
                        :rules="[{ required: true, message: '请输入用户名' }]"
                    >
                        <a-input v-model:value="formState.username" size="large" />
                    </a-form-item>

                    <a-form-item
                        label="密码"
                        name="password"
                        :rules="[{ required: true, message: '请输入密码' }]"
                    >
                        <a-input-password v-model:value="formState.password" size="large" />
                    </a-form-item>

                    <a-form-item>
                        <a-button
                            type="primary"
                            html-type="submit"
                            size="large"
                            :loading="loading"
                            style="width: 100%"
                        >
                            登录
                        </a-button>
                    </a-form-item>

                    <div style="text-align: center;">
                        <a-button type="link" @click="showRegister">
                            注册账号
                        </a-button>
                    </div>
                </a-form>
            </a-card>

            <!-- 注册对话框 -->
            <a-modal
                v-model:visible="registerVisible"
                title="注册账号"
                @ok="handleRegister"
                :confirmLoading="registerLoading"
            >
                <a-form
                    :model="registerForm"
                    layout="vertical"
                >
                    <a-form-item
                        label="用户名"
                        name="username"
                        :rules="[{ required: true, message: '请输入用户名' }]"
                    >
                        <a-input v-model:value="registerForm.username" />
                    </a-form-item>

                    <a-form-item
                        label="密码"
                        name="password"
                        :rules="[{ required: true, message: '请输入密码' }]"
                    >
                        <a-input-password v-model:value="registerForm.password" />
                    </a-form-item>

                    <a-form-item
                        label="确认密码"
                        name="confirmPassword"
                        :rules="[
                            { required: true, message: '请确认密码' },
                            { validator: validateConfirmPassword }
                        ]"
                    >
                        <a-input-password v-model:value="registerForm.confirmPassword" />
                    </a-form-item>

                    <a-form-item
                        label="邮箱"
                        name="email"
                        :rules="[
                            { type: 'email', message: '请输入有效的邮箱地址' }
                        ]"
                    >
                        <a-input v-model:value="registerForm.email" />
                    </a-form-item>
                </a-form>
            </a-modal>
        </div>
    `,

    setup() {
        const store = useStore()
        const router = useRouter()
        const route = useRoute()

        // 登录表单状态
        const formState = ref({
            username: '',
            password: ''
        })
        const loading = ref(false)

        // 注册表单状态
        const registerVisible = ref(false)
        const registerLoading = ref(false)
        const registerForm = ref({
            username: '',
            password: '',
            confirmPassword: '',
            email: ''
        })

        // 处理登录
        const handleSubmit = async () => {
            loading.value = true
            try {
                const success = await store.dispatch('login', {
                    username: formState.value.username,
                    password: formState.value.password
                })

                if (success) {
                    const redirectPath = route.query.redirect || '/dashboard'
                    router.push(redirectPath)
                    antd.message.success('登录成功')
                } else {
                    antd.message.error('登录失败')
                }
            } catch (error) {
                antd.message.error('登录失败: ' + error.message)
            } finally {
                loading.value = false
            }
        }

        // 显示注册对话框
        const showRegister = () => {
            registerVisible.value = true
        }

        // 验证确认密码
        const validateConfirmPassword = async (rule, value) => {
            if (value && value !== registerForm.value.password) {
                throw new Error('两次输入的密码不一致')
            }
        }

        // 处理注册
        const handleRegister = async () => {
            registerLoading.value = true
            try {
                const response = await request.user.register({
                    username: registerForm.value.username,
                    password: registerForm.value.password,
                    email: registerForm.value.email
                })

                if (response.data.success) {
                    registerVisible.value = false
                    antd.message.success('注册成功，请登录')
                    // 清空注册表单
                    registerForm.value = {
                        username: '',
                        password: '',
                        confirmPassword: '',
                        email: ''
                    }
                }
            } catch (error) {
                antd.message.error('注册失败: ' + error.message)
            } finally {
                registerLoading.value = false
            }
        }

        return {
            formState,
            loading,
            handleSubmit,
            registerVisible,
            registerLoading,
            registerForm,
            showRegister,
            handleRegister,
            validateConfirmPassword
        }
    }
} 